/*
 * VSEPR 전자쌍 반발 엔진 (VseprEngine)
 * 성취기준: 화학01-1-04  분자 구조와 극성을 이해하고 분자 간 힘과 물질의 성질을 관련지을 수 있다
 * 핵심역량: 과학적 사고력, 과학적 탐구능력
 *
 * [설계 원칙 — 할루시네이션 배제]
 *  1. 구조를 "가정"하지 않는다. 중심 원자 주위 전자 영역을 단위 구면 위의 점으로 놓고,
 *     점들 사이의 반발 에너지를 실제로 최소화(완화)하여 평형 배치를 "도출"한다.
 *  2. 고립전자쌍의 위치(예: 삼각쌍뿔에서 적도 vs 축, 팔면체에서 trans)도 하드코딩하지 않고,
 *     "이상 기하"에서의 반발 에너지가 최소가 되는 배치를 엔진이 스스로 선택한다.
 *     (이는 교과서 VSEPR의 "90° 접촉, 특히 LP-LP 반발 최소화" 논리와 동일하다.)
 *  3. 엔진이 계산한 값(computed)과 교과서 검증값(reference)을 분리해 보관하고,
 *     호출부에서 교차검증할 수 있게 한다. 계산값은 "경향"이며, 실험값이 권위 데이터다.
 *
 * [물리 모델]
 *  반발 에너지  E = Σ_(i<j)  w_i · w_j / d_ij^p      (d_ij = 두 점 사이 거리, p = 반발 지수)
 *  - 결합 전자쌍 가중치 w_BP = 1.0
 *  - 고립 전자쌍 가중치 w_LP > 1.0  (LP가 더 강하게 반발 → 결합각 압축 재현)
 *  완화: 각 점에 작용하는 힘을 구면 접평면에 투영해 이동시키고 다시 정규화(경사하강).
 */

(function (global) {
  'use strict';

  // ── 3차원 벡터 유틸 ─────────────────────────────────────────────
  const V = {
    sub: (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]],
    add: (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]],
    scale: (a, s) => [a[0]*s, a[1]*s, a[2]*s],
    dot: (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => { const L = Math.hypot(a[0],a[1],a[2]) || 1; return [a[0]/L, a[1]/L, a[2]/L]; },
  };

  // ── 검증용 참조 데이터(교과서 표준값) ───────────────────────────
  // key: AX{결합수}E{고립쌍수}. ideal=이상각, exp=실험값(권위), example=대표분자
  const VSEPR_REFERENCE = {
    'AX2E0': { electron:'직선형',     molecular:'직선형',     ideal:[180],     exp:[180],        example:'CO₂, BeCl₂', polar:false },
    'AX3E0': { electron:'평면삼각형',  molecular:'평면삼각형',  ideal:[120],     exp:[120],        example:'BF₃, CO₃²⁻', polar:false },
    'AX2E1': { electron:'평면삼각형',  molecular:'굽은형',     ideal:[120],     exp:[119.0],      example:'SO₂, O₃',    polar:true  },
    'AX4E0': { electron:'정사면체형',  molecular:'정사면체형',  ideal:[109.5],   exp:[109.5],      example:'CH₄, NH₄⁺',  polar:false },
    'AX3E1': { electron:'정사면체형',  molecular:'삼각뿔형',   ideal:[109.5],   exp:[106.7],      example:'NH₃, PCl₃',  polar:true  },
    'AX2E2': { electron:'정사면체형',  molecular:'굽은형',     ideal:[109.5],   exp:[104.5],      example:'H₂O, H₂S',   polar:true  },
    'AX5E0': { electron:'삼각쌍뿔형',  molecular:'삼각쌍뿔형',  ideal:[90,120],  exp:[90,120],     example:'PCl₅',       polar:false },
    'AX4E1': { electron:'삼각쌍뿔형',  molecular:'시소형',     ideal:[90,120],  exp:[101.6,173.1],example:'SF₄',        polar:true  },
    'AX3E2': { electron:'삼각쌍뿔형',  molecular:'T자형',     ideal:[90],      exp:[87.5],       example:'ClF₃',       polar:true  },
    'AX2E3': { electron:'삼각쌍뿔형',  molecular:'직선형',     ideal:[180],     exp:[180],        example:'XeF₂, I₃⁻',  polar:false },
    'AX6E0': { electron:'정팔면체형',  molecular:'정팔면체형',  ideal:[90],      exp:[90],         example:'SF₆',        polar:false },
    'AX5E1': { electron:'정팔면체형',  molecular:'사각뿔형',   ideal:[90],      exp:[84.8],       example:'BrF₅',       polar:true  },
    'AX4E2': { electron:'정팔면체형',  molecular:'평면사각형',  ideal:[90],      exp:[90],         example:'XeF₄',       polar:false },
  };

  // ── 초기 시드 배치(정준 기하) ───────────────────────────────────
  // 완화 솔버가 빠르고 안정적으로 수렴하도록 알려진 이상 기하에서 출발한다.
  function seedPositions(n) {
    if (n === 2) return [[0,0,1], [0,0,-1]];
    if (n === 3) return ringXY(3);
    if (n === 4) return [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]].map(V.norm); // 정사면체
    if (n === 5) return [[0,0,1],[0,0,-1], ...ringXY(3)];                     // 삼각쌍뿔(축2+적도3)
    if (n === 6) return [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]; // 정팔면체
    if (n === 7) return [[0,0,1],[0,0,-1], ...ringXY(5)];                     // 오각쌍뿔
    throw new Error('지원 범위(전자영역 2~7)를 벗어났습니다: ' + n);
  }
  function ringXY(k) {
    const out = [];
    for (let i = 0; i < k; i++) {
      const t = (2 * Math.PI * i) / k;
      out.push([Math.cos(t), Math.sin(t), 0]);
    }
    return out;
  }

  // ── 반발 에너지 ─────────────────────────────────────────────────
  function totalEnergy(P, W, p) {
    let E = 0;
    for (let i = 0; i < P.length; i++)
      for (let j = i + 1; j < P.length; j++) {
        const d = V.len(V.sub(P[i], P[j])) || 1e-9;
        E += (W[i] * W[j]) / Math.pow(d, p);
      }
    return E;
  }

  // ── 완화 1스텝(애니메이션용으로 외부 노출) ──────────────────────
  // P(단위벡터 배열)를 반발력에 따라 한 스텝 이동시킨 새 배열을 반환.
  function relaxStep(P, W, p, lr) {
    const F = P.map(() => [0, 0, 0]);
    for (let i = 0; i < P.length; i++) {
      for (let j = 0; j < P.length; j++) {
        if (i === j) continue;
        const diff = V.sub(P[i], P[j]);
        const d = V.len(diff) || 1e-9;
        const mag = (p * W[i] * W[j]) / Math.pow(d, p + 2);
        F[i] = V.add(F[i], V.scale(diff, mag));
      }
    }
    return P.map((pi, i) => {
      const radial = V.scale(pi, V.dot(F[i], pi));
      const tang = V.sub(F[i], radial);
      return V.norm(V.add(pi, V.scale(tang, lr)));
    });
  }

  // ── 완화(경사하강) ──────────────────────────────────────────────
  // 각 점에 반발력 합력을 구해 접평면에 투영해 이동, 구면으로 재정규화.
  function relax(P0, W, opts) {
    const p = opts.repulsionExponent;
    let lr = opts.learningRate;
    let P = P0.map(v => V.norm(v.slice()));
    for (let step = 0; step < opts.iterations; step++) {
      P = relaxStep(P, W, p, lr);
      lr *= opts.lrDecay; // 학습률 점감 → 안정적 수렴
    }
    return P;
  }

  // ── 두 결합 벡터 사이 각도(˚) ───────────────────────────────────
  function angleBetween(a, b) {
    let c = V.dot(V.norm(a), V.norm(b));
    c = Math.max(-1, Math.min(1, c));
    return (Math.acos(c) * 180) / Math.PI;
  }

  // ── 메인: 전자쌍 반발 구조 도출 ─────────────────────────────────
  /**
   * @param {{bonding:number, lone:number}} input  결합 전자쌍 수, 고립 전자쌍 수
   * @returns 구조 도출 결과 객체
   */
  function solve(input, userOpts) {
    const bonding = input.bonding | 0;
    const lone = input.lone | 0;
    const n = bonding + lone; // 전자 영역 수(입체수)
    if (bonding < 1) throw new Error('결합 전자쌍은 최소 1개 이상이어야 합니다.');
    if (n < 2 || n > 7) throw new Error('전자 영역 수는 2~7만 지원합니다(현재 ' + n + ').');

    const opts = Object.assign({
      repulsionExponent: 1,   // p: 1(쿨롱형). 등가중치면 어떤 p>0든 정준 기하 동일
      bondingWeight: 1.0,     // 결합쌍 가중치
      lonePairWeight: 1.25,   // 고립쌍 가중치(>1 → 결합각 압축)
      iterations: 1600,
      learningRate: 0.08,
      lrDecay: 0.9985,
    }, userOpts || {});

    const seed = seedPositions(n);

    // ── 1단계: 고립전자쌍을 "어디에" 둘지 결정 ──────────────────────
    //  가능한 모든 슬롯 조합에 대해 "이상 기하(고정 시드)"에서의 반발 에너지를
    //  계산해 최저값을 고른다. 이는 교과서 VSEPR의 "90° 접촉(특히 LP-LP) 최소화"
    //  논리와 정확히 일치한다. (완화 후 에너지로 고르면 일그러짐 인공산물로
    //  cis가 잘못 선택되므로, 배치는 반드시 고정 시드에서 판정한다.)
    const slotCombos = combinations(n, lone);
    const candidates = slotCombos.length ? slotCombos : [[]];
    const placementScores = [];
    let chosen = null;
    for (const loneSlots of candidates) {
      const W = new Array(n).fill(opts.bondingWeight);
      for (const s of loneSlots) W[s] = opts.lonePairWeight;
      const Eseed = totalEnergy(seed, W, opts.repulsionExponent);
      placementScores.push({ loneSlots: loneSlots.slice(), seedEnergy: +Eseed.toFixed(6) });
      if (!chosen || Eseed < chosen.Eseed - 1e-9) chosen = { Eseed, loneSlots: loneSlots.slice(), W };
    }

    // ── 2단계: 선택된 배치만 완화하여 결합각 압축(고립쌍 효과)을 도출 ──
    const W = chosen.W;
    const isLone = new Array(n).fill(false);
    chosen.loneSlots.forEach(s => (isLone[s] = true));
    const P = relax(seed.map(v => v.slice()), W, opts);
    const best = { E: totalEnergy(P, W, opts.repulsionExponent), P, W, isLone };

    // 결합쌍 / 고립쌍 벡터 분리
    const bondVectors = [];
    const loneVectors = [];
    best.P.forEach((v, i) => (best.isLone[i] ? loneVectors : bondVectors).push(v));

    // 결합쌍 사이 각도 계산(분자 기하에서 "보이는" 각)
    const angles = [];
    for (let i = 0; i < bondVectors.length; i++)
      for (let j = i + 1; j < bondVectors.length; j++)
        angles.push(angleBetween(bondVectors[i], bondVectors[j]));
    angles.sort((a, b) => a - b);

    // 대표 결합각(가장 빈번한 최소 인접각) — 교육용 단일 지표
    const minAngle = angles.length ? angles[0] : null;

    // 극성 판정(말단 원자가 모두 동일하다는 가정):
    // 결합 단위벡터 합의 크기가 0이면 대칭 → 무극성, 아니면 극성.
    let sum = [0, 0, 0];
    bondVectors.forEach(v => (sum = V.add(sum, V.norm(v))));
    const dipoleMag = V.len(sum);
    const computedPolar = dipoleMag > 0.05;

    // 참조 데이터 매칭(이름·실험값은 검증된 표준값)
    const key = `AX${bonding}E${lone}`;
    const ref = VSEPR_REFERENCE[key] || null;

    return {
      input: { bonding, lone },
      stericNumber: n,
      notation: key,                       // AXmEn 표기
      electronGeometry: ref ? ref.electron : '(참조표 없음)',
      molecularGeometry: ref ? ref.molecular : '(참조표 없음)',
      reference: ref,                      // 검증값(이상각/실험각/예시/극성)
      computed: {                          // 엔진이 도출한 값(경향)
        bondVectors,
        loneVectors,
        allVectors: best.P,
        isLone: best.isLone,
        angles: angles.map(a => +a.toFixed(2)),
        representativeAngle: minAngle == null ? null : +minAngle.toFixed(2),
        dipoleMagnitude: +dipoleMag.toFixed(4),
        polar: computedPolar,
        energy: +best.E.toFixed(6),
      },
      options: opts,
      placementScores,   // 고립쌍 배치 후보별 고정시드 에너지(선택 근거, 교육용)
    };
  }

  // 조합: n개 슬롯에서 k개 선택
  function combinations(n, k) {
    const res = [];
    const idx = Array.from({ length: n }, (_, i) => i);
    function go(start, acc) {
      if (acc.length === k) { res.push(acc.slice()); return; }
      for (let i = start; i < n; i++) { acc.push(idx[i]); go(i + 1, acc); acc.pop(); }
    }
    go(0, []);
    return k === 0 ? [[]] : res;
  }

  const VseprEngine = {
    solve, VSEPR_REFERENCE, seedPositions, V,
    _internal: { relax, relaxStep, totalEnergy, seedPositions, angleBetween, combinations }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = VseprEngine;
  else global.VseprEngine = VseprEngine;
})(typeof window !== 'undefined' ? window : globalThis);
