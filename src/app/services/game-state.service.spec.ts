import { TestBed } from '@angular/core/testing';
import { GameStateService, GameVariant } from './game-state.service';

describe('GameStateService', () => {
  let svc: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(GameStateService);
  });

  it('should bust on third attempt and revert the whole turn', () => {
    svc.startGame(['A', 'B'], 100 as GameVariant);
    expect(svc.currentIndex()).toBe(0);
    svc.submitAttempt(19, 3);
    expect(svc.playersList()[0]!.score).toBe(43);
    expect(svc.attempt()).toBe(2);
    svc.submitAttempt(20, 2);
    expect(svc.playersList()[0]!.score).toBe(3);
    expect(svc.attempt()).toBe(3);
    svc.submitAttempt(20, 1);
    expect(svc.playersList()[0]!.score).toBe(100);
    expect(svc.currentIndex()).toBe(1);
    expect(svc.attempt()).toBe(1);
  });

  it('should declare winner on exact zero', () => {
    svc.startGame(['A', 'B'], 20 as GameVariant);
    svc.submitAttempt(20, 1);
    expect(svc.isFinished()).toBe(true);
    expect(svc.winner()).toBe(0);
    expect(svc.playersList()[0]!.score).toBe(0);
  });

  it('should clamp multipliers for bull bases', () => {
    expect(GameStateService.allowedMultipliers(25)).toEqual([1, 2]);
    expect(GameStateService.allowedMultipliers(50)).toEqual([1]);
    expect(GameStateService.clampMultiplier(25, 3)).toBe(2);
    expect(GameStateService.clampMultiplier(50, 3)).toBe(1);
  });
});
