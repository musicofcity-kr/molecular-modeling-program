import { describe, expect, it, vi } from 'vitest';
import {
  JOIN_CLASSROOM_DEFERRED_MESSAGE,
  JOIN_CLASSROOM_JOINED_MESSAGE,
  JOIN_CLASSROOM_LOCAL_ONLY_MESSAGE,
  JOIN_CLASSROOM_SERVER_FALLBACK_MESSAGE,
  joinClassroomWithTrustedEndpoint,
} from './classroomJoinService';

describe('classroomJoinService', () => {
  it('keeps classroom joining local when Firebase anonymous UID is unavailable', async () => {
    await expect(
      joinClassroomWithTrustedEndpoint({
        classCode: 'CHEM-101',
        joinCode: 'A1B2',
        displayName: '익명 학생',
        anonymousStudentId: 'student-local',
      }),
    ).resolves.toMatchObject({
      ok: true,
      status: 'local_session_only',
      classCode: 'CHEM-101',
      studentMessage: JOIN_CLASSROOM_LOCAL_ONLY_MESSAGE,
    });
  });

  it('defers trusted membership creation instead of writing Firestore from the browser', async () => {
    await expect(
      joinClassroomWithTrustedEndpoint({
        classCode: 'CHEM-101',
        joinCode: 'A1B2',
        displayName: '익명 학생',
        anonymousStudentId: 'student-local',
        firebaseUid: 'firebase-student-uid',
      }),
    ).resolves.toMatchObject({
      ok: true,
      status: 'deferred_until_trusted_endpoint',
      classCode: 'CHEM-101',
      studentMessage: JOIN_CLASSROOM_DEFERRED_MESSAGE,
      developerMessage:
        'joinClassroom skipped: Firebase ID token is missing; no trusted endpoint call attempted.',
    });
  });

  it('calls the trusted classroom join endpoint when Firebase ID token exists', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          status: 'joined',
          classCode: 'CHEM-101',
          activityTemplateIds: [
            'draw-water',
            'draw-methane',
            'draw-ammonia',
            'bad template id',
          ],
          studentMessage: JOIN_CLASSROOM_JOINED_MESSAGE,
          developerMessage: 'membership created',
        }),
        { status: 200 },
      ),
    );

    await expect(
      joinClassroomWithTrustedEndpoint(
        {
          classCode: 'CHEM-101',
          joinCode: 'A1B2',
          displayName: '익명 학생',
          anonymousStudentId: 'student-local',
          firebaseUid: 'firebase-student-uid',
          idToken: 'firebase-id-token',
        },
        { fetcher },
      ),
    ).resolves.toMatchObject({
      ok: true,
      status: 'joined',
      classCode: 'CHEM-101',
      activityTemplateIds: ['draw-water', 'draw-methane', 'draw-ammonia'],
      studentMessage: JOIN_CLASSROOM_JOINED_MESSAGE,
    });

    expect(fetcher).toHaveBeenCalledWith(
      '/api/join-classroom',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      idToken: 'firebase-id-token',
      classCode: 'CHEM-101',
      joinCode: 'A1B2',
      displayName: '익명 학생',
      anonymousStudentId: 'student-local',
    });
  });

  it('blocks classroom entry when the trusted endpoint explicitly rejects an unknown classroom', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          status: 'classroom_not_found',
          studentMessage: '수업코드를 서버에서 확인하지 못했습니다.',
          developerMessage: 'classroom missing',
        }),
        { status: 404 },
      ),
    );

    await expect(
      joinClassroomWithTrustedEndpoint(
        {
          classCode: 'CHEM-404',
          joinCode: 'A1B2',
          displayName: '익명 학생',
          anonymousStudentId: 'student-local',
          firebaseUid: 'firebase-student-uid',
          idToken: 'firebase-id-token',
        },
        { fetcher },
      ),
    ).resolves.toMatchObject({
      ok: false,
      status: 'classroom_not_found',
      classCode: 'CHEM-404',
      studentMessage: '수업코드를 서버에서 확인하지 못했습니다.',
      developerMessage: 'classroom missing',
    });
  });

  it.each([
    {
      responseStatus: 404,
      body: '',
      contentType: 'text/plain',
    },
    {
      responseStatus: 405,
      body: '<!doctype html><title>Method Not Allowed</title>',
      contentType: 'text/html',
    },
  ])(
    'defers local entry when the trusted endpoint is unavailable with a non-JSON $responseStatus response',
    async ({ responseStatus, body, contentType }) => {
      const fetcher = vi.fn().mockResolvedValue(
        new Response(body, {
          status: responseStatus,
          headers: { 'content-type': contentType },
        }),
      );

      await expect(
        joinClassroomWithTrustedEndpoint(
          {
            classCode: 'CHEM-101',
            joinCode: 'A1B2',
            displayName: '익명 학생',
            anonymousStudentId: 'student-local',
            firebaseUid: 'firebase-student-uid',
            idToken: 'firebase-id-token',
          },
          { fetcher },
        ),
      ).resolves.toMatchObject({
        ok: true,
        status: 'deferred_until_trusted_endpoint',
        classCode: 'CHEM-101',
        activityTemplateIds: [],
        studentMessage: JOIN_CLASSROOM_SERVER_FALLBACK_MESSAGE,
        developerMessage: `joinClassroom endpoint unavailable: status=${responseStatus}, rejection payload not provided`,
      });
    },
  );

  it('defers local entry when a 404 JSON body omits an explicit rejection status', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(
      joinClassroomWithTrustedEndpoint(
        {
          classCode: 'CHEM-101',
          joinCode: 'A1B2',
          displayName: '익명 학생',
          anonymousStudentId: 'student-local',
          firebaseUid: 'firebase-student-uid',
          idToken: 'firebase-id-token',
        },
        { fetcher },
      ),
    ).resolves.toMatchObject({
      ok: true,
      status: 'deferred_until_trusted_endpoint',
      classCode: 'CHEM-101',
      studentMessage: JOIN_CLASSROOM_SERVER_FALLBACK_MESSAGE,
    });
  });

  it.each([
    {
      apiStatus: 'unauthorized',
      studentMessage: '학생 인증 정보를 다시 확인해 주세요.',
    },
    {
      apiStatus: 'classroom_not_found',
      studentMessage: '수업코드를 찾지 못했습니다.',
    },
    {
      apiStatus: 'join_disabled',
      studentMessage: '현재 수업방은 입장을 받지 않습니다.',
    },
    {
      apiStatus: 'rate_limited',
      studentMessage: '잠시 후 다시 시도해 주세요.',
    },
  ])(
    'blocks explicit payload rejection $apiStatus even when HTTP status is 200',
    async ({ apiStatus, studentMessage }) => {
      const fetcher = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            status: apiStatus,
            studentMessage,
            developerMessage: `join rejected in payload: ${apiStatus}`,
          }),
          { status: 200 },
        ),
      );

      await expect(
        joinClassroomWithTrustedEndpoint(
          {
            classCode: 'CHEM-101',
            joinCode: 'WRONG',
            displayName: '익명 학생',
            anonymousStudentId: 'student-local',
            firebaseUid: 'firebase-student-uid',
            idToken: 'firebase-id-token',
          },
          { fetcher },
        ),
      ).resolves.toMatchObject({
        ok: false,
        status: apiStatus,
        classCode: 'CHEM-101',
        activityTemplateIds: [],
        studentMessage,
        developerMessage: `join rejected in payload: ${apiStatus}`,
      });
    },
  );

  it('prioritizes an explicit rejection payload over a 5xx transport status', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          status: 'unauthorized',
          studentMessage: '학생 인증이 거절되었습니다.',
          developerMessage: 'authorization rejected despite gateway status',
        }),
        { status: 503 },
      ),
    );

    await expect(
      joinClassroomWithTrustedEndpoint(
        {
          classCode: 'CHEM-101',
          joinCode: 'A1B2',
          displayName: '익명 학생',
          anonymousStudentId: 'student-local',
          firebaseUid: 'firebase-student-uid',
          idToken: 'firebase-id-token',
        },
        { fetcher },
      ),
    ).resolves.toMatchObject({
      ok: false,
      status: 'unauthorized',
      classCode: 'CHEM-101',
      activityTemplateIds: [],
      studentMessage: '학생 인증이 거절되었습니다.',
    });
  });

  it.each([
    {
      responseStatus: 403,
      apiStatus: 'join_disabled',
      studentMessage: '입장 확인코드가 맞지 않습니다.',
    },
    {
      responseStatus: 429,
      apiStatus: 'rate_limited',
      studentMessage: '입장 확인코드 오류가 여러 번 발생했습니다.',
    },
  ])(
    'blocks classroom entry for trusted endpoint rejection $responseStatus ($apiStatus)',
    async ({ responseStatus, apiStatus, studentMessage }) => {
      const fetcher = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            status: apiStatus,
            studentMessage,
            developerMessage: `join rejected: ${apiStatus}`,
          }),
          { status: responseStatus },
        ),
      );

      await expect(
        joinClassroomWithTrustedEndpoint(
          {
            classCode: 'CHEM-101',
            joinCode: 'WRONG',
            displayName: '익명 학생',
            anonymousStudentId: 'student-local',
            firebaseUid: 'firebase-student-uid',
            idToken: 'firebase-id-token',
          },
          { fetcher },
        ),
      ).resolves.toMatchObject({
        ok: false,
        status: apiStatus,
        classCode: 'CHEM-101',
        activityTemplateIds: [],
        studentMessage,
        developerMessage: `join rejected: ${apiStatus}`,
      });
    },
  );

  it('keeps deferred fallback for an explicit server_error payload over HTTP 200', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          status: 'server_error',
          studentMessage:
            '수업코드 서버 확인 중 문제가 발생했습니다. 현재 브라우저에서 활동을 계속할 수 있습니다.',
          developerMessage: 'temporary server failure in payload',
        }),
        { status: 200 },
      ),
    );

    await expect(
      joinClassroomWithTrustedEndpoint(
        {
          classCode: 'CHEM-101',
          joinCode: 'A1B2',
          displayName: '익명 학생',
          anonymousStudentId: 'student-local',
          firebaseUid: 'firebase-student-uid',
          idToken: 'firebase-id-token',
        },
        { fetcher },
      ),
    ).resolves.toMatchObject({
      ok: true,
      status: 'deferred_until_trusted_endpoint',
      classCode: 'CHEM-101',
      studentMessage:
        '수업코드 서버 확인 중 문제가 발생했습니다. 현재 브라우저에서 활동을 계속할 수 있습니다.',
      developerMessage: 'temporary server failure in payload',
    });
  });

  it('fails closed for an unexpected successful HTTP payload', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          status: 'unexpected',
        }),
        { status: 200 },
      ),
    );

    await expect(
      joinClassroomWithTrustedEndpoint(
        {
          classCode: 'CHEM-101',
          joinCode: 'A1B2',
          displayName: '익명 학생',
          anonymousStudentId: 'student-local',
          firebaseUid: 'firebase-student-uid',
          idToken: 'firebase-id-token',
        },
        { fetcher },
      ),
    ).resolves.toMatchObject({
      ok: false,
      status: 'rejected',
      classCode: 'CHEM-101',
      activityTemplateIds: [],
    });
  });

  it('keeps the deferred recovery policy when the trusted endpoint has a server failure', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          status: 'server_error',
          studentMessage:
            '수업코드 서버 확인 중 문제가 발생했습니다. 현재 브라우저에서 활동을 계속할 수 있습니다.',
          developerMessage: 'temporary server failure',
        }),
        { status: 500 },
      ),
    );

    await expect(
      joinClassroomWithTrustedEndpoint(
        {
          classCode: 'CHEM-101',
          joinCode: 'A1B2',
          displayName: '익명 학생',
          anonymousStudentId: 'student-local',
          firebaseUid: 'firebase-student-uid',
          idToken: 'firebase-id-token',
        },
        { fetcher },
      ),
    ).resolves.toMatchObject({
      ok: true,
      status: 'deferred_until_trusted_endpoint',
      classCode: 'CHEM-101',
      studentMessage:
        '수업코드 서버 확인 중 문제가 발생했습니다. 현재 브라우저에서 활동을 계속할 수 있습니다.',
      developerMessage: 'temporary server failure',
    });
  });

  it('keeps a student-safe fallback when the trusted endpoint request fails', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network down'));

    await expect(
      joinClassroomWithTrustedEndpoint(
        {
          classCode: 'CHEM-101',
          joinCode: 'A1B2',
          displayName: '익명 학생',
          anonymousStudentId: 'student-local',
          firebaseUid: 'firebase-student-uid',
          idToken: 'firebase-id-token',
        },
        { fetcher },
      ),
    ).resolves.toMatchObject({
      ok: true,
      status: 'deferred_until_trusted_endpoint',
      classCode: 'CHEM-101',
      studentMessage: JOIN_CLASSROOM_SERVER_FALLBACK_MESSAGE,
      developerMessage: 'joinClassroom endpoint request failed: network down',
    });
  });
});
