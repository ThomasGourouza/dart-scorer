import { TestBed } from '@angular/core/testing';
import { GAME_STORAGE_KEY, GameStateService, GameVariant } from './game-state.service';

const twoPlayers = [
  { name: 'A', colorId: 'coral' },
  { name: 'B', colorId: 'sky' },
] as const;

describe('GameStateService', () => {
  beforeEach(() => {
    localStorage.removeItem(GAME_STORAGE_KEY);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.removeItem(GAME_STORAGE_KEY);
  });

  it('should bust on third attempt and revert the whole turn', () => {
    const svc = TestBed.inject(GameStateService);
    svc.startGame([...twoPlayers], 100 as GameVariant);
    expect(svc.currentIndex()).toBe(0);
    expect(svc.submitAttempt(19, 3)).toBe('next_attempt');
    expect(svc.playersList()[0]!.score).toBe(43);
    expect(svc.attempt()).toBe(2);
    svc.submitAttempt(20, 2);
    expect(svc.playersList()[0]!.score).toBe(3);
    expect(svc.attempt()).toBe(3);
    expect(svc.submitAttempt(20, 1)).toBe('bust');
    expect(svc.playersList()[0]!.score).toBe(100);
    expect(svc.currentIndex()).toBe(1);
    expect(svc.attempt()).toBe(1);
  });

  it('should declare winner on exact zero', () => {
    const svc = TestBed.inject(GameStateService);
    svc.startGame([...twoPlayers], 20 as GameVariant);
    expect(svc.submitAttempt(20, 1)).toBe('win');
    expect(svc.isFinished()).toBe(true);
    expect(svc.winner()).toBe(0);
    expect(svc.playersList()[0]!.score).toBe(0);
  });

  it('should clamp multipliers for bull bases', () => {
    expect(GameStateService.allowedMultipliers(25)).toEqual([1]);
    expect(GameStateService.allowedMultipliers(50)).toEqual([1]);
    expect(GameStateService.clampMultiplier(25, 3)).toBe(1);
    expect(GameStateService.clampMultiplier(25, 2)).toBe(1);
    expect(GameStateService.clampMultiplier(50, 3)).toBe(1);
  });

  it('should persist and restore round-trip', () => {
    const svc = TestBed.inject(GameStateService);
    svc.startGame([...twoPlayers], 301);
    expect(svc.submitAttempt(20, 1)).toBe('next_attempt');
    expect(localStorage.getItem(GAME_STORAGE_KEY)).toBeTruthy();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const svc2 = TestBed.inject(GameStateService);
    svc2.restoreFromStorage();

    expect(svc2.hasActiveGame()).toBe(true);
    expect(svc2.gameVariant()).toBe(301);
    expect(svc2.playersList().length).toBe(2);
    expect(svc2.playersList()[0]!.name).toBe('A');
    expect(svc2.playersList()[0]!.colorId).toBe('coral');
    expect(svc2.playersList()[0]!.score).toBe(281);
    expect(svc2.attempt()).toBe(2);
    expect(svc2.currentIndex()).toBe(0);
  });

  it('should clear storage on abort', () => {
    const svc = TestBed.inject(GameStateService);
    svc.startGame([...twoPlayers], 501);
    expect(localStorage.getItem(GAME_STORAGE_KEY)).toBeTruthy();
    svc.abortGame();
    expect(localStorage.getItem(GAME_STORAGE_KEY)).toBeNull();
    expect(svc.hasActiveGame()).toBe(false);
  });

  it('should take back attempt by attempt', () => {
    const svc = TestBed.inject(GameStateService);
    svc.startGame([...twoPlayers], 301);
    expect(svc.canTakeBack()).toBe(false);
    svc.submitAttempt(20, 1);
    expect(svc.playersList()[0]!.score).toBe(281);
    expect(svc.canTakeBack()).toBe(true);
    expect(svc.takeBack()).toEqual({ base: 20, mult: 1 });
    expect(svc.playersList()[0]!.score).toBe(301);
    expect(svc.attempt()).toBe(1);
    expect(svc.canTakeBack()).toBe(false);
  });

  it('should return submitted sector and multiplier on take back', () => {
    const svc = TestBed.inject(GameStateService);
    svc.startGame([...twoPlayers], 301);
    svc.submitAttempt(19, 3);
    expect(svc.takeBack()).toEqual({ base: 19, mult: 3 });
  });

  it('should take back a winning dart', () => {
    const svc = TestBed.inject(GameStateService);
    svc.startGame([...twoPlayers], 20 as GameVariant);
    svc.submitAttempt(20, 1);
    expect(svc.isFinished()).toBe(true);
    expect(svc.canTakeBack()).toBe(true);
    svc.takeBack();
    expect(svc.isFinished()).toBe(false);
    expect(svc.playersList()[0]!.score).toBe(20);
  });

  it('should persist and restore undo history', () => {
    const svc = TestBed.inject(GameStateService);
    svc.startGame([...twoPlayers], 301);
    svc.submitAttempt(10, 1);
    svc.submitAttempt(5, 1);
    expect(svc.canTakeBack()).toBe(true);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const svc2 = TestBed.inject(GameStateService);
    svc2.restoreFromStorage();
    expect(svc2.playersList()[0]!.score).toBe(286);
    expect(svc2.canTakeBack()).toBe(true);
    svc2.takeBack();
    expect(svc2.playersList()[0]!.score).toBe(291);
  });
});
