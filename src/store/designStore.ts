import { create } from 'zustand';

export type ElementType = 'text' | 'rect' | 'circle' | 'image' | 'video' | 'isiScroll' | 'shape' | 'html';

export interface AnimationKeyframe {
    id: string;
    /** Absolute time on the global timeline, in seconds */
    time: number;
    x?: number;
    y?: number;
    /** 0-100 */
    opacity?: number;
    /** Degrees */
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    /** Pixels (or other CSS units) */
    letterSpacing?: number;
    /** GSAP ease id, e.g. "power2.out" */
    easing: string;
}

export interface ElementAnimation {
    keyframes: AnimationKeyframe[];
    loop?: boolean;
}

export interface Artboard {
    id: string;
    label: string;
    width: number;
    height: number;
    /** Elements belonging to this artboard (each size keeps its own layout). */
    elements: DesignElement[];
}

export interface DesignElement {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    width?: number;
    height?: number;
    name?: string;
    visible?: boolean;
    locked?: boolean;
    fill?: string;
    text?: string;
    htmlContent?: string;
    path?: string;
    points?: number[];
    fontSize?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    src?: string;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    textAlign?: 'left' | 'center' | 'right';
    opacity?: number;
    cornerRadius?: number;
    stroke?: string;
    strokeWidth?: number;
    letterSpacing?: number;
    lineHeight?: number;
    shadowBlur?: number;
    shadowColor?: string;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowOpacity?: number;
    // Keyframe animation
    anim?: ElementAnimation;
    // Preset animation id (legacy names or Animista catalog id; converted to keyframes when not overridden)
    animation?: string;
    animationDuration?: number;
    animationDelay?: number;
    animationLoop?: boolean;
    // Creatopy-style entrance / exit animations (preset ids from Animista catalog)
    enterAnimation?: string;
    exitAnimation?: string;
    enterDelay?: number;
    exitDelay?: number;
    // Additional timed animation blocks, each playing inside its own timeframe
    animations?: ElementTimedAnimation[];
    // Hover Effects
    hoverAnimation?: 'none' | 'colorChange' | 'glow' | 'shadowPop' | 'letterSpacing' | 'scale';
    hoverColor?: string;
    // ISI Scroll properties
    isiText?: string;
    isiScrollSpeed?: number;
    isiAutoStart?: boolean;
    isiLogoSrc?: string;
    isiLogoLink?: string;
    isiLogoWidth?: number;
    isiLogoPosition?: 'top' | 'bottom';
    isiPadding?: number;
    isiPaddingTop?: number;
    isiPaddingRight?: number;
    isiPaddingBottom?: number;
    isiPaddingLeft?: number;
    isiMargin?: number;
    isiMarginTop?: number;
    isiMarginRight?: number;
    isiMarginBottom?: number;
    isiMarginLeft?: number;
    isiBackgroundColor?: string;
    isiScrollbarColor?: string;
    isiScrollbarTrackColor?: string;
    isiScrollbarMarginTop?: number;
    isiScrollbarMarginRight?: number;
    isiScrollbarPadding?: number;
    isiScrollbarHeight?: number;
    isiScrollbarWidth?: number;
    isiLineHeight?: number;
    isiLetterSpacing?: number;
    isiFontFamily?: string;
    isiFontWeight?: string;
    isiFontStyle?: 'normal' | 'italic';
    isiBorderWidth?: number;
    isiBorderColor?: string;
    // Traditional ISI header bar ("Prescribing Information" patient link strip)
    isiHeaderText?: string;
    isiHeaderLink?: string;
    isiHeaderColor?: string;
    isiHeaderBackground?: string;
    isiHeaderHeight?: number;
    // Wave properties
    waveAmplitude?: number;
    waveFrequency?: number;
    waveSpeed?: number;
    waveColor?: string;
    wavePoints?: number;
    waveLayers?: number;
}

export interface SelectedKeyframe {
    elementId: string;
    keyframeId: string;
}

/**
 * A timed animation block on an element. Unlike the single main `animation`
 * (which starts at 0), each block plays its preset inside its own timeframe,
 * letting one element run several animations (e.g. fade in at 0s, fade out at 5s).
 */
export interface ElementTimedAnimation {
    id: string;
    /** Preset animation id (Animista catalog or legacy name). */
    preset: string;
    /** Absolute start time (seconds) within the timeline. */
    start: number;
    /** Duration of the animation (seconds). */
    duration: number;
    /** Extra delay inside the block (seconds). */
    delay?: number;
    /** Easing for this block (GSAP ease id, e.g. "power2.out"). */
    ease?: string;
    /** Repeat the block until the end of the timeline. */
    loop?: boolean;
}

interface HistoryState {
    elements: DesignElement[];
    canvasWidth: number;
    canvasHeight: number;
    totalDuration: number;
    loop: boolean;
    canvasBackground: string;
    canvasBackgroundImage?: string;
    artboards: Artboard[];
    activeArtboardId: string;
}

interface DesignState {
    elements: DesignElement[];
    selectedId: string | null;
    selectedIds: string[];
    selectedKeyframe: SelectedKeyframe | null;
    playheadTime: number;
    isPlaying: boolean;
    /** True while the user hovers over ISI content during playback — the global
     *  playhead (timeline) freezes until the mouse leaves. */
    previewPaused: boolean;
    canvasWidth: number;
    canvasHeight: number;
    totalDuration: number;
    loop: boolean;
    canvasBackground: string;
    canvasBackgroundImage?: string;
    artboards: Artboard[];
    activeArtboardId: string;
    /** Show every artboard side by side in the canvas (edit multiple sizes without switching). */
    multiArtboardView: boolean;

    // History
    past: HistoryState[];
    future: HistoryState[];
    clearHistory: () => void;

    // Element Actions
    addElement: (element: DesignElement) => void;
    updateElement: (id: string, updates: Partial<DesignElement>) => void;
    duplicateElement: (id: string) => void;
    selectElement: (id: string | null) => void;
    selectElements: (ids: string[]) => void;
    removeElement: (id: string) => void;
    removeElements: (ids: string[]) => void;

    reorderElement: (id: string, type: 'up' | 'down' | 'top' | 'bottom') => void;
    toggleVisibility: (id: string) => void;
    toggleLock: (id: string) => void;

    // Keyframe Actions
    addKeyframe: (elementId: string, keyframe: AnimationKeyframe) => void;
    updateKeyframe: (elementId: string, keyframeId: string, updates: Partial<AnimationKeyframe>) => void;
    removeKeyframe: (elementId: string, keyframeId: string) => void;
    selectKeyframe: (selection: SelectedKeyframe | null) => void;
    setPlayheadTime: (time: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setPreviewPaused: (paused: boolean) => void;
    setTotalDuration: (duration: number) => void;
    setLoop: (loop: boolean) => void;

    // Timed animation block actions
    addElementAnimation: (elementId: string, block: ElementTimedAnimation) => void;
    updateElementAnimation: (elementId: string, blockId: string, updates: Partial<ElementTimedAnimation>) => void;
    removeElementAnimation: (elementId: string, blockId: string) => void;

    // Artboards
    addArtboard: (width: number, height: number, label?: string) => void;
    addCampaignSizes: (sizes: Array<{ width: number; height: number; label?: string }>) => void;
    removeArtboard: (id: string) => void;
    setActiveArtboard: (id: string) => void;
    setMultiArtboardView: (value: boolean) => void;

    // Global Actions
    reset: () => void;
    setSize: (width: number, height: number) => void;
    setCanvasBackground: (color: string) => void;
    setCanvasBackgroundImage: (src: string | undefined) => void;
    loadTemplate: (elements: DesignElement[], width: number, height: number, totalDuration?: number) => void;

    undo: () => void;
    redo: () => void;
}

const ARTBOARD_PRESETS: Array<{ label: string; width: number; height: number }> = [
    { label: 'Medium Rectangle', width: 300, height: 250 },
    { label: 'Leaderboard', width: 728, height: 90 },
    { label: 'Wide Skyscraper', width: 160, height: 600 },
    { label: 'Half Page', width: 300, height: 600 },
    { label: 'Billboard', width: 970, height: 250 },
    { label: 'Large Rectangle', width: 336, height: 280 },
    { label: 'Square', width: 250, height: 250 },
    { label: 'Mobile Leaderboard', width: 320, height: 50 },
    { label: 'Mobile Banner', width: 320, height: 100 },
    { label: 'Skyscraper', width: 120, height: 600 },
];

export const getArtboardPresets = () => ARTBOARD_PRESETS;

let artboardIdCounter = 0;
export const makeArtboard = (width: number, height: number, label?: string, elements: DesignElement[] = []): Artboard => ({
    id: `art-${Date.now()}-${++artboardIdCounter}`,
    label: label || `${width}x${height}`,
    width,
    height,
    elements,
});

const defaultArtboard = (): Artboard => ({ id: 'art-1', label: '300x250', width: 300, height: 250, elements: [] });

const elementLabel = (el: DesignElement) =>
    el.name || `${el.type.charAt(0).toUpperCase() + el.type.slice(1)} ${el.id.slice(-4)}`;

const snapshot = (state: DesignState): HistoryState => ({
    elements: state.elements,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    totalDuration: state.totalDuration,
    loop: state.loop,
    canvasBackground: state.canvasBackground,
    canvasBackgroundImage: state.canvasBackgroundImage,
    artboards: state.artboards,
    activeArtboardId: state.activeArtboardId,
});

const saveHistory = (state: DesignState): Partial<DesignState> => ({
    past: [...state.past, snapshot(state)],
    future: [],
});

/** Write new elements into state AND the active artboard (each size is independent). */
const withActiveElements = (state: DesignState, elements: DesignElement[]): Partial<DesignState> => ({
    elements,
    artboards: state.artboards.map((a) => (a.id === state.activeArtboardId ? { ...a, elements } : a)),
});

/** Copy the active board's current elements into its artboard record before switching boards. */
const persistActiveElements = (state: DesignState): Artboard[] =>
    state.artboards.map((a) => (a.id === state.activeArtboardId ? { ...a, elements: state.elements } : a));

/**
 * Clone elements for another artboard with fresh, board-unique ids so that in
 * the multi-size view every size owns independent elements — selecting or
 * editing a component affects only that one size, never the others.
 * Keyframe and timed-animation block ids are remapped too.
 */
const cloneElementsForBoard = (elements: DesignElement[], boardId: string): DesignElement[] => {
    const suffix = `-${boardId.replace(/^art-/, 'b')}`;
    return elements.map((el) => ({
        ...el,
        id: `${el.id}${suffix}`,
        anim: el.anim
            ? {
                ...el.anim,
                keyframes: el.anim.keyframes.map((k) => ({ ...k, id: `${k.id}${suffix}` })),
            }
            : undefined,
        animations: el.animations?.map((b) => ({ ...b, id: `${b.id}${suffix}` })),
    }));
};

export const reflowElements = (
    elements: DesignElement[],
    oldWidth: number,
    oldHeight: number,
    newWidth: number,
    newHeight: number,
): DesignElement[] => {
    if (!oldWidth || !oldHeight) return elements;
    const scaleX = newWidth / oldWidth;
    const scaleY = newHeight / oldHeight;
    const minScale = Math.min(scaleX, scaleY);

    return elements.map((el) => {
        const newX = (el.x / oldWidth) * newWidth;
        const newY = (el.y / oldHeight) * newHeight;
        const targetWidth = (el.width || 0) * minScale;
        const targetHeight = (el.height || 0) * minScale;

        return {
            ...el,
            x: newX,
            y: newY,
            width: targetWidth,
            height: targetHeight,
            fontSize: el.fontSize ? Math.round(el.fontSize * minScale) : el.fontSize,
        };
    });
};

const extendForNewKeyframe = (totalDuration: number, time: number) =>
    Math.max(totalDuration, Math.ceil(time * 2) / 2);

export const useDesignStore = create<DesignState>((set) => ({
    elements: [],
    selectedId: null,
    selectedIds: [],
    selectedKeyframe: null,
    playheadTime: 0,
    isPlaying: false,
    previewPaused: false,
    canvasWidth: 300,
    canvasHeight: 250,
    totalDuration: 10,
    loop: true,
    canvasBackground: '#ffffff',
    canvasBackgroundImage: undefined,
    artboards: [defaultArtboard()],
    activeArtboardId: 'art-1',
    multiArtboardView: false,
    past: [],
    future: [],

    clearHistory: () => set({ past: [], future: [] }),

    reset: () => set({
        elements: [],
        selectedId: null,
        selectedIds: [],
        selectedKeyframe: null,
        playheadTime: 0,
        isPlaying: false,
        previewPaused: false,
        canvasWidth: 300,
        canvasHeight: 250,
        totalDuration: 10,
        loop: true,
        canvasBackground: '#ffffff',
        canvasBackgroundImage: undefined,
        artboards: [defaultArtboard()],
        activeArtboardId: 'art-1',
        multiArtboardView: false,
        past: [],
        future: [],
    }),

    addElement: (element) =>
        set((state) => ({
            ...saveHistory(state),
            ...withActiveElements(state, [...state.elements, element]),
            selectedId: element.id,
        })),

    updateElement: (id, updates) =>
        set((state) => ({
            ...saveHistory(state),
            ...withActiveElements(
                state,
                state.elements.map((el) => {
                    if (el.id !== id) return el;
                    const isPresetUpdate =
                        updates.enterAnimation !== undefined ||
                        updates.exitAnimation !== undefined ||
                        updates.animations !== undefined ||
                        updates.animation !== undefined ||
                        updates.animationDuration !== undefined ||
                        updates.animationDelay !== undefined ||
                        updates.animationLoop !== undefined ||
                        updates.enterDelay !== undefined ||
                        updates.exitDelay !== undefined;
                    return {
                        ...el,
                        ...updates,
                        // If user sets any preset animation field, clear manual keyframes
                        // to prevent conflicting/duplicate animations.
                        anim: isPresetUpdate ? undefined : (updates.anim !== undefined ? updates.anim : el.anim),
                    };
                })
            ),
        })),

    selectElement: (id) => set((state) => ({
        selectedId: id,
        selectedIds: id ? [id] : [],
        selectedKeyframe: id ? state.selectedKeyframe : null,
    })),

    selectElements: (ids) => set((state) => ({
        selectedIds: ids,
        selectedId: ids.length === 1 ? ids[0] : (state.selectedId && ids.includes(state.selectedId) ? state.selectedId : (ids[0] || null)),
        selectedKeyframe: ids.length === 1 ? state.selectedKeyframe : null,
    })),

    duplicateElement: (id) =>
        set((state) => {
            const el = state.elements.find((e) => e.id === id);
            if (!el) return state;
            const clone: DesignElement = {
                ...el,
                id: `el-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
                name: `${el.name || elementLabel(el)} Copy`,
                x: (el.x || 0) + 12,
                y: (el.y || 0) + 12,
                anim: el.anim
                    ? {
                        ...el.anim,
                        keyframes: el.anim.keyframes.map((k) => ({
                            ...k,
                            id: `kf-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
                        })),
                    }
                    : undefined,
            };
            return {
                ...saveHistory(state),
                ...withActiveElements(state, [...state.elements, clone]),
                selectedId: clone.id,
            };
        }),

    removeElement: (id) =>
        set((state) => ({
            ...saveHistory(state),
            selectedId: state.selectedId === id ? null : state.selectedId,
            selectedIds: state.selectedIds.filter((sid) => sid !== id),
            selectedKeyframe:
                state.selectedKeyframe?.elementId === id ? null : state.selectedKeyframe,
            ...withActiveElements(
                state,
                state.elements.filter((el) => el.id !== id)
            ),
        })),

    removeElements: (ids) =>
        set((state) => ({
            ...saveHistory(state),
            selectedId: state.selectedId && ids.includes(state.selectedId) ? null : state.selectedId,
            selectedIds: state.selectedIds.filter((sid) => !ids.includes(sid)),
            selectedKeyframe: state.selectedKeyframe && ids.includes(state.selectedKeyframe.elementId) ? null : state.selectedKeyframe,
            ...withActiveElements(
                state,
                state.elements.filter((el) => !ids.includes(el.id))
            ),
        })),

    reorderElement: (id, type) =>
        set((state) => {
            const index = state.elements.findIndex((el) => el.id === id);
            if (index === -1) return state;
            const newElements = [...state.elements];
            const [el] = newElements.splice(index, 1);

            if (type === 'top') {
                newElements.push(el);
            } else if (type === 'bottom') {
                newElements.unshift(el);
            } else if (type === 'up') {
                newElements.splice(Math.min(index + 1, newElements.length), 0, el);
            } else {
                newElements.splice(Math.max(index - 1, 0), 0, el);
            }

            return { ...saveHistory(state), ...withActiveElements(state, newElements) };
        }),

    toggleVisibility: (id) =>
        set((state) => ({
            ...saveHistory(state),
            ...withActiveElements(
                state,
                state.elements.map((el) =>
                    el.id === id ? { ...el, visible: el.visible === false } : el
                )
            ),
        })),

    toggleLock: (id) =>
        set((state) => ({
            ...saveHistory(state),
            ...withActiveElements(
                state,
                state.elements.map((el) => (el.id === id ? { ...el, locked: !el.locked } : el))
            ),
        })),

    addKeyframe: (elementId, keyframe) =>
        set((state) => ({
            ...saveHistory(state),
            elements: state.elements.map((el) => {
                if (el.id !== elementId) return el;
                const anim = el.anim || { keyframes: [] };
                const keyframes = [...anim.keyframes.filter((k) => k.id !== keyframe.id), keyframe].sort(
                    (a, b) => a.time - b.time,
                );
                return {
                    ...el,
                    // When user manually adds keyframes, clear all preset animation fields
                    // to avoid conflicting/duplicate animations.
                    enterAnimation: undefined,
                    enterDelay: undefined,
                    exitAnimation: undefined,
                    exitDelay: undefined,
                    animations: undefined,
                    animation: undefined,
                    animationDuration: undefined,
                    animationDelay: undefined,
                    animationLoop: undefined,
                    anim: { ...anim, keyframes },
                };
            }),
            selectedKeyframe: { elementId, keyframeId: keyframe.id },
            totalDuration: extendForNewKeyframe(state.totalDuration, keyframe.time),
            ...withActiveElements(
                state,
                state.elements.map((el) => {
                    if (el.id !== elementId) return el;
                    const anim = el.anim || { keyframes: [] };
                    const keyframes = [...anim.keyframes.filter((k) => k.id !== keyframe.id), keyframe].sort(
                        (a, b) => a.time - b.time,
                    );
                    return {
                        ...el,
                        enterAnimation: undefined,
                        enterDelay: undefined,
                        exitAnimation: undefined,
                        exitDelay: undefined,
                        animations: undefined,
                        animation: undefined,
                        animationDuration: undefined,
                        animationDelay: undefined,
                        animationLoop: undefined,
                        anim: { ...anim, keyframes },
                    };
                })
            ),
        })),

    updateKeyframe: (elementId, keyframeId, updates) =>
        set((state) => ({
            ...saveHistory(state),
            ...withActiveElements(
                state,
                state.elements.map((el) => {
                    if (el.id !== elementId || !el.anim) return el;
                    return {
                        ...el,
                        anim: {
                            ...el.anim,
                            keyframes: el.anim.keyframes.map((k) =>
                                k.id === keyframeId
                                    ? { ...k, ...updates, time: updates.time ?? k.time }
                                    : k
                            ),
                        },
                    };
                })
            ),
        })),

    removeKeyframe: (elementId, keyframeId) =>
        set((state) => ({
            ...saveHistory(state),
            ...withActiveElements(
                state,
                state.elements.map((el) => {
                    if (el.id !== elementId || !el.anim) return el;
                    return {
                        ...el,
                        anim: { ...el.anim, keyframes: el.anim.keyframes.filter((k) => k.id !== keyframeId) },
                    };
                })
            ),
            selectedKeyframe:
                state.selectedKeyframe?.elementId === elementId &&
                    state.selectedKeyframe.keyframeId === keyframeId
                    ? null
                    : state.selectedKeyframe,
        })),

    selectKeyframe: (selection) => set({ selectedKeyframe: selection }),

    addElementAnimation: (elementId, block) =>
        set((state) => ({
            ...saveHistory(state),
            ...withActiveElements(
                state,
                state.elements.map((el) =>
                    el.id === elementId
                        ? { ...el, anim: undefined, animations: [...(el.animations || []), block] }
                        : el
                )
            ),
            totalDuration: Math.max(
                state.totalDuration,
                Math.ceil((block.start + block.duration) * 2) / 2
            ),
        })),

    updateElementAnimation: (elementId, blockId, updates) =>
        set((state) => ({
            ...saveHistory(state),
            ...withActiveElements(
                state,
                state.elements.map((el) =>
                    el.id === elementId
                        ? {
                            ...el,
                            anim: undefined,
                            animations: (el.animations || []).map((b) =>
                                b.id === blockId ? { ...b, ...updates } : b
                            ),
                        }
                        : el
                )
            ),
        })),

    removeElementAnimation: (elementId, blockId) =>
        set((state) => ({
            ...saveHistory(state),
            ...withActiveElements(
                state,
                state.elements.map((el) =>
                    el.id === elementId
                        ? { ...el, animations: (el.animations || []).filter((b) => b.id !== blockId) }
                        : el
                )
            ),
        })),

    setPlayheadTime: (time) => set((state) => ({
        playheadTime: Math.max(0, Math.min(time, state.totalDuration)),
    })),

    setIsPlaying: (playing) => set((state) => ({
        isPlaying: playing,
        // Stopping playback clears any hover-pause so the next run starts fresh.
        previewPaused: playing ? state.previewPaused : false,
    })),
    setPreviewPaused: (paused) => set({ previewPaused: paused }),
    setTotalDuration: (duration) => set((state) => ({
        ...saveHistory(state),
        totalDuration: Math.max(0.5, duration),
        playheadTime: Math.min(state.playheadTime, Math.max(0.5, duration)),
    })),
    setLoop: (loop) => set((state) => ({ ...saveHistory(state), loop })),

    addArtboard: (width, height, label) =>
        set((state) => {
            const artboards = persistActiveElements(state);
            const existing = artboards.find((a) => a.width === width && a.height === height);
            if (existing) {
                return {
                    ...saveHistory(state),
                    artboards,
                    activeArtboardId: existing.id,
                    elements:
                        existing.elements && existing.elements.length > 0
                            ? existing.elements
                            : reflowElements(state.elements, state.canvasWidth, state.canvasHeight, existing.width, existing.height),
                    canvasWidth: existing.width,
                    canvasHeight: existing.height,
                };
            }
            const reflowed = reflowElements(state.elements, state.canvasWidth, state.canvasHeight, width, height);
            const artboard = makeArtboard(width, height, label);
            const boardElements = cloneElementsForBoard(reflowed, artboard.id);
            artboard.elements = boardElements;
            return {
                ...saveHistory(state),
                artboards: [...artboards, artboard],
                activeArtboardId: artboard.id,
                elements: boardElements,
                canvasWidth: artboard.width,
                canvasHeight: artboard.height,
            };
        }),

    addCampaignSizes: (sizes) =>
        set((state) => {
            const artboards = persistActiveElements(state);
            const newBoards: Artboard[] = [];
            sizes.forEach((s) => {
                if (!artboards.some((a) => a.width === s.width && a.height === s.height)) {
                    const board = makeArtboard(s.width, s.height, s.label);
                    board.elements = cloneElementsForBoard(
                        reflowElements(state.elements, state.canvasWidth, state.canvasHeight, s.width, s.height),
                        board.id,
                    );
                    newBoards.push(board);
                }
            });
            if (newBoards.length === 0) return state;
            const first = newBoards[0];
            return {
                ...saveHistory(state),
                artboards: [...artboards, ...newBoards],
                activeArtboardId: first.id,
                elements: first.elements,
                canvasWidth: first.width,
                canvasHeight: first.height,
            };
        }),

    removeArtboard: (id) =>
        set((state) => {
            if (state.artboards.length <= 1) return state;
            const removedActive = state.activeArtboardId === id;
            const artboards = state.artboards.filter((a) => a.id !== id);
            const activeArtboardId = removedActive
                ? artboards[artboards.length - 1].id
                : state.activeArtboardId;
            const active = artboards.find((a) => a.id === activeArtboardId)!;
            return {
                ...saveHistory(state),
                artboards,
                activeArtboardId,
                elements: removedActive
                    ? active.elements && active.elements.length > 0
                        ? active.elements
                        : cloneElementsForBoard(
                            reflowElements(state.elements, state.canvasWidth, state.canvasHeight, active.width, active.height),
                            active.id,
                        )
                    : state.elements,
                canvasWidth: active.width,
                canvasHeight: active.height,
            };
        }),

    setActiveArtboard: (id) =>
        set((state) => {
            const artboard = state.artboards.find((a) => a.id === id);
            if (!artboard || artboard.id === state.activeArtboardId) return state;
            return {
                ...saveHistory(state),
                artboards: persistActiveElements(state),
                elements:
                    artboard.elements && artboard.elements.length > 0
                        ? artboard.elements
                        : cloneElementsForBoard(
                            reflowElements(state.elements, state.canvasWidth, state.canvasHeight, artboard.width, artboard.height),
                            artboard.id,
                        ),
                canvasWidth: artboard.width,
                canvasHeight: artboard.height,
                activeArtboardId: artboard.id,
            };
        }),

    setMultiArtboardView: (value) => set({ multiArtboardView: value, selectedId: null }),

    setSize: (width, height) =>
        set((state) => {
            const reflowed = reflowElements(state.elements, state.canvasWidth, state.canvasHeight, width, height);
            return {
                ...saveHistory(state),
                elements: reflowed,
                canvasWidth: width,
                canvasHeight: height,
                artboards: state.artboards.map((a) =>
                    a.id === state.activeArtboardId ? { ...a, width, height, elements: reflowed } : a
                ),
            };
        }),

    setCanvasBackground: (color) =>
        set((state) => ({ ...saveHistory(state), canvasBackground: color })),

    setCanvasBackgroundImage: (src) =>
        set((state) => ({ ...saveHistory(state), canvasBackgroundImage: src })),

    loadTemplate: (elements, width, height, totalDuration = 10) =>
        set(() => {
            const clean = elements.map((el) => ({ ...el, visible: el.visible !== false }));
            return {
                elements: clean,
                selectedId: null,
                selectedKeyframe: null,
                playheadTime: 0,
                isPlaying: false,
                canvasWidth: width,
                canvasHeight: height,
                totalDuration,
                loop: true,
                canvasBackground: '#ffffff',
                canvasBackgroundImage: undefined,
                artboards: [{ id: 'art-1', label: `${width}x${height}`, width, height, elements: clean }],
                activeArtboardId: 'art-1',
                past: [],
                future: [],
            };
        }),

    undo: () => set((state) => {
        if (state.past.length === 0) return state;
        const previous = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, -1);
        return {
            past: newPast,
            future: [snapshot(state), ...state.future],
            elements: previous.elements,
            canvasWidth: previous.canvasWidth,
            canvasHeight: previous.canvasHeight,
            totalDuration: previous.totalDuration,
            loop: previous.loop,
            canvasBackground: previous.canvasBackground,
            canvasBackgroundImage: previous.canvasBackgroundImage,
            artboards: previous.artboards,
            activeArtboardId: previous.activeArtboardId,
            selectedId: null,
            selectedKeyframe: null,
        };
    }),

    redo: () => set((state) => {
        if (state.future.length === 0) return state;
        const next = state.future[0];
        const newFuture = state.future.slice(1);
        return {
            past: [...state.past, snapshot(state)],
            future: newFuture,
            elements: next.elements,
            canvasWidth: next.canvasWidth,
            canvasHeight: next.canvasHeight,
            totalDuration: next.totalDuration,
            loop: next.loop,
            canvasBackground: next.canvasBackground,
            canvasBackgroundImage: next.canvasBackgroundImage,
            artboards: next.artboards,
            activeArtboardId: next.activeArtboardId,
            selectedId: null,
            selectedKeyframe: null,
        };
    }),
}));
