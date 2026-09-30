import { useState, useEffect } from 'react';
import { Game, Player, PlayerMatchStats } from '../types/football';
import { DEFAULT_SQUAD, DEFAULT_MATCH_SETTINGS } from '../constants/defaultSquad';
import { FORMATION_PRESETS, getFormationById, DEFAULT_FORMATION_ID } from '../constants/formations';
import { createDefaultPhases } from '../utils/matchUtils';

export const STORAGE_KEY = 'grassroots_manager_state_v2';

export function initializeDefaultGame(squad: Player[]): Game {
  const initialPreset = getFormationById(DEFAULT_FORMATION_ID);
  const initialPhases = createDefaultPhases(squad, initialPreset);
  const initialAssignedIds = new Set(Object.values(initialPhases[0]?.assignments || {}));

  const initialStats: Record<string, PlayerMatchStats> = {};
  squad.forEach(p => {
    initialStats[p.id] = {
      secondsPlayed: 0,
      secondsOnBench: 0,
      goals: 0,
      assists: 0,
      subIns: initialAssignedIds.has(p.id) ? 1 : 0,
      subOuts: 0,
      currentOnPitch: initialAssignedIds.has(p.id),
      secondsByZone: {},
    };
  });

  return {
    id: `game-${Date.now()}`,
    title: 'vs Red Star Rovers (Home)',
    date: new Date().toISOString().split('T')[0],
    opponentName: 'Red Star Rovers',
    venue: 'Home',
    status: 'in_progress',
    settings: { ...DEFAULT_MATCH_SETTINGS },
    presentPlayerIds: squad.map(p => p.id),
    phases: initialPhases,
    currentFormationId: DEFAULT_FORMATION_ID,
    activeAssignments: initialPhases[0]?.assignments || {},
    customPositions: undefined,
    elapsedSeconds: 0,
    currentPeriod: 1,
    scoreUs: 0,
    scoreThem: 0,
    playerStats: initialStats,
    events: [],
    executedPhaseIds: [],
    periodSnapshots: {},
  };
}

export function useGameManager() {
  // 1. Squad State
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_players`);
    return saved ? JSON.parse(saved) : DEFAULT_SQUAD;
  });

  // 2. Games List State
  const [games, setGames] = useState<Game[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_games`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Migration for older schemas
          return parsed.map((g: any) => {
            let migrated = { ...g };

            if (!migrated.settings.matchDurationMinutes) {
              const oldDur = (migrated.settings.periodDurationMinutes || 30) * (migrated.settings.totalPeriods || 2);
              migrated.settings = { ...migrated.settings, matchDurationMinutes: oldDur || 60 };
            }

            if (!migrated.presentPlayerIds) {
              const savedPlayersStr = localStorage.getItem(`${STORAGE_KEY}_players`);
              const legacyPlayers = savedPlayersStr ? JSON.parse(savedPlayersStr) : DEFAULT_SQUAD;
              migrated.presentPlayerIds = legacyPlayers
                .filter((p: any) => p.isPresent !== false)
                .map((p: any) => p.id);
            }

            if (!migrated.periodSnapshots) {
              migrated.periodSnapshots = {};
            }

            return migrated;
          });
        }
      } catch (e) {
        console.error('Failed to parse saved games:', e);
      }
    }
    return [initializeDefaultGame(DEFAULT_SQUAD)];
  });

  // 3. Active Game ID State
  const [activeGameId, setActiveGameId] = useState<string>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_active_game_id`);
    return saved || games[0]?.id || '';
  });

  // Active game reference
  const activeGame = games.find(g => g.id === activeGameId) || games[0];

  // Persistence
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_players`, JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_games`, JSON.stringify(games));
  }, [games]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_active_game_id`, activeGameId);
  }, [activeGameId]);

  // Helper to mutate active game
  const updateActiveGame = (updater: Partial<Game> | ((prev: Game) => Game)) => {
    setGames(prevGames =>
      prevGames.map(g => {
        if (g.id !== activeGame.id) return g;
        if (typeof updater === 'function') {
          return updater(g);
        }
        return { ...g, ...updater };
      })
    );
  };

  // Handle Create New Game
  const handleCreateGame = (newGameData: Partial<Game>, copyFromGameId?: string) => {
    let baseGame: Game | undefined;
    if (copyFromGameId) {
      baseGame = games.find(g => g.id === copyFromGameId);
    }

    const defaultPreset = getFormationById(DEFAULT_FORMATION_ID);
    const initialPhases = baseGame
      ? JSON.parse(JSON.stringify(baseGame.phases))
      : createDefaultPhases(players, defaultPreset);

    const initialAssignments = baseGame
      ? { ...baseGame.activeAssignments }
      : initialPhases[0]?.assignments || {};

    const initialAssignedIds = new Set(Object.values(initialAssignments));

    const initialStats: Record<string, PlayerMatchStats> = {};
    players.forEach(p => {
      initialStats[p.id] = {
        secondsPlayed: 0,
        secondsOnBench: 0,
        goals: 0,
        assists: 0,
        subIns: initialAssignedIds.has(p.id) ? 1 : 0,
        subOuts: 0,
        currentOnPitch: initialAssignedIds.has(p.id),
        secondsByZone: {},
      };
    });

    const newGame: Game = {
      id: `game-${Date.now()}`,
      title: newGameData.title || `vs ${newGameData.opponentName || 'Opponent'}`,
      date: newGameData.date || new Date().toISOString().split('T')[0],
      opponentName: newGameData.opponentName || 'Opponent FC',
      venue: newGameData.venue || 'Home',
      status: 'in_progress',
      settings: baseGame ? { ...baseGame.settings } : { ...DEFAULT_MATCH_SETTINGS },
      presentPlayerIds: baseGame ? [...baseGame.presentPlayerIds] : players.map(p => p.id),
      phases: initialPhases,
      currentFormationId: baseGame ? baseGame.currentFormationId : DEFAULT_FORMATION_ID,
      activeAssignments: initialAssignments,
      customPositions: baseGame?.customPositions ? { ...baseGame.customPositions } : undefined,
      elapsedSeconds: 0,
      currentPeriod: 1,
      scoreUs: 0,
      scoreThem: 0,
      playerStats: initialStats,
      events: [],
      executedPhaseIds: [],
      periodSnapshots: {},
    };

    setGames(prev => [newGame, ...prev]);
    setActiveGameId(newGame.id);
    return newGame;
  };

  // Handle Delete Game
  const handleDeleteGame = (gameId: string) => {
    if (games.length <= 1) {
      alert('Cannot delete the only existing match. Create another one first.');
      return false;
    }
    const remaining = games.filter(g => g.id !== gameId);
    setGames(remaining);
    if (activeGameId === gameId) {
      setActiveGameId(remaining[0].id);
    }
    return true;
  };

  // Handle Update Game Status
  const handleUpdateGameStatus = (gameId: string, status: 'upcoming' | 'in_progress' | 'completed') => {
    setGames(prev =>
      prev.map(g => (g.id === gameId ? { ...g, status } : g))
    );
  };

  // Handle Attendance Toggle with automatic cleanup of absent players
  const handleToggleAttendance = (playerId: string) => {
    updateActiveGame(prev => {
      const isCurrentlyPresent = prev.presentPlayerIds.includes(playerId);
      const newIds = isCurrentlyPresent 
        ? prev.presentPlayerIds.filter(id => id !== playerId)
        : [...prev.presentPlayerIds, playerId];

      // If marked absent, unassign from active pitch slots and future phases
      let nextAssignments = { ...prev.activeAssignments };
      let nextPhases = [...prev.phases];

      if (isCurrentlyPresent) {
        Object.keys(nextAssignments).forEach(slotId => {
          if (nextAssignments[slotId] === playerId) {
            delete nextAssignments[slotId];
          }
        });
        nextPhases = nextPhases.map(ph => {
          const phAssignments = { ...ph.assignments };
          Object.keys(phAssignments).forEach(slotId => {
            if (phAssignments[slotId] === playerId) {
              delete phAssignments[slotId];
            }
          });
          return { ...ph, assignments: phAssignments };
        });
      }

      return {
        ...prev,
        presentPlayerIds: newIds,
        activeAssignments: nextAssignments,
        phases: nextPhases,
      };
    });
  };

  // Full Database / State Backup & Restore
  const handleExportBackup = () => {
    const backupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      players,
      games,
      activeGameId,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grassroots-fc-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.players && data.games) {
          setPlayers(data.players);
          setGames(data.games);
          if (data.activeGameId) setActiveGameId(data.activeGameId);
          alert('Team data and match history restored successfully!');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return {
    players,
    setPlayers,
    games,
    setGames,
    activeGameId,
    setActiveGameId,
    activeGame,
    updateActiveGame,
    handleCreateGame,
    handleDeleteGame,
    handleUpdateGameStatus,
    handleToggleAttendance,
    handleExportBackup,
    handleImportBackup,
  };
}
