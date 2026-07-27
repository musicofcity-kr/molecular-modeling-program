import { describe, expect, it, vi } from 'vitest';
import {
  createKetcherTouchMouseBridgeController,
  installKetcherTouchMouseBridge,
  type KetcherMouseEventCoordinates,
  type KetcherMouseEventType,
  type KetcherTouchBridgeEvent,
} from './ketcher-touch-mouse-bridge';

type DispatchRecord = {
  target: EventTarget;
  type: KetcherMouseEventType;
  coordinates: KetcherMouseEventCoordinates;
};

function dispatchableTarget(): EventTarget {
  return {
    dispatchEvent: vi.fn(),
  } as unknown as EventTarget;
}

function touch(
  identifier: number,
  clientX: number,
  clientY: number,
): Touch {
  return {
    identifier,
    clientX,
    clientY,
    screenX: clientX + 10,
    screenY: clientY + 20,
  } as Touch;
}

function touchEvent({
  target,
  touches = [],
  changedTouches = touches,
}: {
  target: EventTarget;
  touches?: Touch[];
  changedTouches?: Touch[];
}) {
  const preventDefault = vi.fn();
  const event: KetcherTouchBridgeEvent = {
    target,
    touches,
    changedTouches,
    preventDefault,
  };

  return { event, preventDefault };
}

function createFixture() {
  const canvas = dispatchableTarget();
  const canvasChild = dispatchableTarget();
  const toolbar = dispatchableTarget();
  const dispatched: DispatchRecord[] = [];
  const controller = createKetcherTouchMouseBridgeController({
    resolveCanvas: (target) => (target === canvasChild ? canvas : null),
    dispatchMouseEvent: (target, type, coordinates) => {
      dispatched.push({ target, type, coordinates });
    },
  });

  return { canvas, canvasChild, toolbar, dispatched, controller };
}

describe('createKetcherTouchMouseBridgeController', () => {
  it('translates one canvas touch into a mouse drag on the original target', () => {
    const { canvasChild, dispatched, controller } = createFixture();
    const start = touchEvent({
      target: canvasChild,
      touches: [touch(7, 100, 200)],
    });
    const move = touchEvent({
      target: canvasChild,
      touches: [touch(7, 140, 215)],
    });
    const end = touchEvent({
      target: canvasChild,
      touches: [],
      changedTouches: [touch(7, 160, 220)],
    });

    controller.onTouchStart(start.event);
    controller.onTouchMove(move.event);
    controller.onTouchEnd(end.event);

    expect(start.preventDefault).toHaveBeenCalledOnce();
    expect(move.preventDefault).toHaveBeenCalledOnce();
    expect(end.preventDefault).toHaveBeenCalledOnce();
    expect(dispatched.map(({ type }) => type)).toEqual([
      'mousedown',
      'mousemove',
      'mouseup',
    ]);
    expect(dispatched.every(({ target }) => target === canvasChild)).toBe(true);
    expect(dispatched[0]?.coordinates).toMatchObject({
      clientX: 100,
      clientY: 200,
      button: 0,
      buttons: 1,
    });
    expect(dispatched[1]?.coordinates).toMatchObject({
      clientX: 140,
      clientY: 215,
      buttons: 1,
    });
    expect(dispatched[2]?.coordinates).toMatchObject({
      clientX: 160,
      clientY: 220,
      buttons: 0,
    });
  });

  it('does not intercept toolbar or multi-touch starts', () => {
    const { toolbar, canvasChild, dispatched, controller } = createFixture();
    const toolbarStart = touchEvent({
      target: toolbar,
      touches: [touch(1, 10, 10)],
    });
    const multiTouchStart = touchEvent({
      target: canvasChild,
      touches: [touch(1, 10, 10), touch(2, 20, 20)],
    });

    controller.onTouchStart(toolbarStart.event);
    controller.onTouchStart(multiTouchStart.event);

    expect(toolbarStart.preventDefault).not.toHaveBeenCalled();
    expect(multiTouchStart.preventDefault).not.toHaveBeenCalled();
    expect(dispatched).toEqual([]);
  });

  it('releases an active drag without intercepting a new multi-touch gesture', () => {
    const { canvasChild, dispatched, controller } = createFixture();
    const start = touchEvent({
      target: canvasChild,
      touches: [touch(4, 10, 20)],
    });
    const multiTouchMove = touchEvent({
      target: canvasChild,
      touches: [touch(4, 20, 30), touch(5, 30, 40)],
    });

    controller.onTouchStart(start.event);
    controller.onTouchMove(multiTouchMove.event);

    expect(multiTouchMove.preventDefault).not.toHaveBeenCalled();
    expect(dispatched.map(({ type }) => type)).toEqual([
      'mousedown',
      'mouseup',
    ]);

    controller.onTouchEnd(
      touchEvent({
        target: canvasChild,
        touches: [],
        changedTouches: [touch(4, 20, 30)],
      }).event,
    );
    expect(dispatched).toHaveLength(2);
  });

  it('sends mouseup and clears the gesture on touch cancel and disposal', () => {
    const { canvasChild, dispatched, controller } = createFixture();
    const start = touchEvent({
      target: canvasChild,
      touches: [touch(2, 30, 40)],
    });
    const cancel = touchEvent({
      target: canvasChild,
      touches: [],
      changedTouches: [touch(2, 35, 45)],
    });

    controller.onTouchStart(start.event);
    controller.onTouchCancel(cancel.event);

    expect(cancel.preventDefault).toHaveBeenCalledOnce();
    expect(dispatched.map(({ type }) => type)).toEqual([
      'mousedown',
      'mouseup',
    ]);

    controller.onTouchStart(
      touchEvent({
        target: canvasChild,
        touches: [touch(3, 50, 60)],
      }).event,
    );
    controller.dispose();

    expect(dispatched.map(({ type }) => type)).toEqual([
      'mousedown',
      'mouseup',
      'mousedown',
      'mouseup',
    ]);
  });
});

describe('installKetcherTouchMouseBridge', () => {
  it('installs non-passive capture listeners and removes the same listeners', () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const host = {
      addEventListener,
      removeEventListener,
      contains: vi.fn(),
    } as unknown as HTMLElement;

    const cleanup = installKetcherTouchMouseBridge(host);
    cleanup();

    const listenerOptions = { capture: true, passive: false };

    expect(addEventListener).toHaveBeenCalledTimes(4);
    expect(addEventListener.mock.calls.map(([type]) => type)).toEqual([
      'touchstart',
      'touchmove',
      'touchend',
      'touchcancel',
    ]);
    expect(
      addEventListener.mock.calls.every(
        ([, , options]) =>
          JSON.stringify(options) === JSON.stringify(listenerOptions),
      ),
    ).toBe(true);
    expect(removeEventListener).toHaveBeenCalledTimes(4);
    expect(
      removeEventListener.mock.calls.every(
        ([type, listener, options], index) =>
          type === addEventListener.mock.calls[index]?.[0] &&
          listener === addEventListener.mock.calls[index]?.[1] &&
          options === addEventListener.mock.calls[index]?.[2],
      ),
    ).toBe(true);
  });
});
