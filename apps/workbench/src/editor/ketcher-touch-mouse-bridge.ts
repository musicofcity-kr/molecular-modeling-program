const KETCHER_CANVAS_SELECTOR = '[data-testid="canvas"]';

type BridgeTouch = Pick<
  Touch,
  'identifier' | 'clientX' | 'clientY' | 'screenX' | 'screenY'
>;

type BridgeTouchList = ArrayLike<BridgeTouch>;

export type KetcherTouchBridgeEvent = {
  target: EventTarget | null;
  touches: BridgeTouchList;
  changedTouches: BridgeTouchList;
  preventDefault: () => void;
};

export type KetcherMouseEventType = 'mousedown' | 'mousemove' | 'mouseup';

export type KetcherMouseEventCoordinates = {
  clientX: number;
  clientY: number;
  screenX: number;
  screenY: number;
  button: number;
  buttons: number;
};

type KetcherTouchMouseBridgeDependencies = {
  resolveCanvas: (target: EventTarget | null) => EventTarget | null;
  dispatchMouseEvent: (
    target: EventTarget,
    type: KetcherMouseEventType,
    coordinates: KetcherMouseEventCoordinates,
  ) => void;
};

type ActiveTouchGesture = {
  identifier: number;
  target: EventTarget;
  canvas: EventTarget;
  coordinates: Omit<KetcherMouseEventCoordinates, 'button' | 'buttons'>;
};

function findTouch(
  touches: BridgeTouchList,
  identifier: number,
): BridgeTouch | null {
  for (let index = 0; index < touches.length; index += 1) {
    const touch = touches[index];

    if (touch?.identifier === identifier) {
      return touch;
    }
  }

  return null;
}

function getTouchCoordinates(
  touch: BridgeTouch,
): ActiveTouchGesture['coordinates'] {
  return {
    clientX: touch.clientX,
    clientY: touch.clientY,
    screenX: touch.screenX,
    screenY: touch.screenY,
  };
}

function canDispatchEvent(target: EventTarget | null): target is EventTarget {
  return Boolean(
    target &&
      typeof (target as EventTarget & { dispatchEvent?: unknown })
        .dispatchEvent === 'function',
  );
}

/**
 * Ketcher 3.15.0 direct-construction tools consume mouse down/move/up while
 * its embedded SVG canvas does not translate a touch drag into that sequence.
 * Keep the compatibility layer app-owned and outside Ketcher's private APIs.
 */
export function createKetcherTouchMouseBridgeController(
  dependencies: KetcherTouchMouseBridgeDependencies,
) {
  let activeGesture: ActiveTouchGesture | null = null;

  const releaseActiveGesture = () => {
    if (!activeGesture) {
      return;
    }

    const { canvas, coordinates } = activeGesture;
    const target = canDispatchEvent(activeGesture.target)
      ? activeGesture.target
      : canvas;

    dependencies.dispatchMouseEvent(target, 'mouseup', {
      ...coordinates,
      button: 0,
      buttons: 0,
    });
    activeGesture = null;
  };

  const onTouchStart = (event: KetcherTouchBridgeEvent) => {
    if (event.touches.length !== 1) {
      releaseActiveGesture();
      return;
    }

    const touch = event.touches[0];
    const canvas = dependencies.resolveCanvas(event.target);

    if (!touch || !canvas || activeGesture) {
      return;
    }

    const target = canDispatchEvent(event.target) ? event.target : canvas;
    const coordinates = getTouchCoordinates(touch);

    activeGesture = {
      identifier: touch.identifier,
      target,
      canvas,
      coordinates,
    };

    event.preventDefault();
    dependencies.dispatchMouseEvent(target, 'mousedown', {
      ...coordinates,
      button: 0,
      buttons: 1,
    });
  };

  const onTouchMove = (event: KetcherTouchBridgeEvent) => {
    if (!activeGesture) {
      return;
    }

    if (event.touches.length !== 1) {
      releaseActiveGesture();
      return;
    }

    const touch = findTouch(event.touches, activeGesture.identifier);

    if (!touch) {
      releaseActiveGesture();
      return;
    }

    const coordinates = getTouchCoordinates(touch);

    activeGesture.coordinates = coordinates;
    event.preventDefault();
    dependencies.dispatchMouseEvent(activeGesture.target, 'mousemove', {
      ...coordinates,
      button: 0,
      buttons: 1,
    });
  };

  const onTouchEnd = (event: KetcherTouchBridgeEvent) => {
    if (!activeGesture) {
      return;
    }

    const touch = findTouch(event.changedTouches, activeGesture.identifier);

    if (!touch) {
      return;
    }

    activeGesture.coordinates = getTouchCoordinates(touch);
    event.preventDefault();
    releaseActiveGesture();
  };

  const onTouchCancel = (event: KetcherTouchBridgeEvent) => {
    if (!activeGesture) {
      return;
    }

    const touch = findTouch(event.changedTouches, activeGesture.identifier);

    if (event.changedTouches.length > 0 && !touch) {
      return;
    }

    if (touch) {
      activeGesture.coordinates = getTouchCoordinates(touch);
    }

    event.preventDefault();
    releaseActiveGesture();
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    dispose: releaseActiveGesture,
  };
}

function findCanvasWithinHost(
  host: HTMLElement,
  target: EventTarget | null,
): Element | null {
  const closest = (
    target as EventTarget & {
      closest?: (selector: string) => Element | null;
    }
  )?.closest;

  if (typeof closest !== 'function') {
    return null;
  }

  const canvas = closest.call(target, KETCHER_CANVAS_SELECTOR);

  return canvas && host.contains(canvas) ? canvas : null;
}

export function installKetcherTouchMouseBridge(
  host: HTMLElement,
): () => void {
  const controller = createKetcherTouchMouseBridgeController({
    resolveCanvas: (target) => findCanvasWithinHost(host, target),
    dispatchMouseEvent: (target, type, coordinates) => {
      const ownerDocument = (target as Node).ownerDocument;
      const view = ownerDocument?.defaultView ?? window;

      target.dispatchEvent(
        new MouseEvent(type, {
          ...coordinates,
          bubbles: true,
          cancelable: true,
          composed: true,
          detail: 1,
          view,
        }),
      );
    },
  });
  const listenerOptions: AddEventListenerOptions = {
    capture: true,
    passive: false,
  };
  const onTouchStart = (event: TouchEvent) => controller.onTouchStart(event);
  const onTouchMove = (event: TouchEvent) => controller.onTouchMove(event);
  const onTouchEnd = (event: TouchEvent) => controller.onTouchEnd(event);
  const onTouchCancel = (event: TouchEvent) => controller.onTouchCancel(event);

  host.addEventListener('touchstart', onTouchStart, listenerOptions);
  host.addEventListener('touchmove', onTouchMove, listenerOptions);
  host.addEventListener('touchend', onTouchEnd, listenerOptions);
  host.addEventListener('touchcancel', onTouchCancel, listenerOptions);

  return () => {
    host.removeEventListener('touchstart', onTouchStart, listenerOptions);
    host.removeEventListener('touchmove', onTouchMove, listenerOptions);
    host.removeEventListener('touchend', onTouchEnd, listenerOptions);
    host.removeEventListener('touchcancel', onTouchCancel, listenerOptions);
    controller.dispose();
  };
}
