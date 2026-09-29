import React, { useState, useEffect } from 'react';
import { KeepAwake } from '@capacitor-community/keep-awake';
import {
  Player,
  MatchSettings,
  FormationPhase,
  MatchEvent,
  PlayerMatchStats,
  Game,
} from './types/football';
import { DEFAULT_SQUAD, DEFAULT_MATCH_SETTINGS } from './constants/defaultSquad';
import { FORMATION_PRESETS, getFormationById, DEFAULT_FORMATION_ID } from './constants/formations';
import { createDefaultPhases, calculatePhaseDiff, formatTime } from './utils/matchUtils';

import { Pitch } from './components/Pitch';
import { Bench } from './components/Bench';
import { LiveScoreboard } from './components/LiveScoreboard';
import { FormationPlanManager } from './components/FormationPlanManager';
import { SubstitutionAlert } from './components/SubstitutionAlert';
import { GoalModal } from './components/GoalModal';
import { EventTimeline } from './components/EventTimeline';
import { PlayingTimeStats } from './components/PlayingTimeStats';
import { SquadManager } from './components/SquadManager';
import { ExportSummaryModal } from './components/ExportSummaryModal';
import { GamesListView } from './components/GamesListView';
import { GameTacticsTab } from './components/GameTacticsTab';
import { NextSubstitutionBanner } from './components/NextSubstitutionBanner';

import {
  Activity,
  Layers,
  Clock,
  Users,
  Settings,
  Share2,
  Shield,
  Calendar,
  Plus,
  ChevronDown,
  Sparkles,
  ArrowLeftRight,
  Database,
  Download,
  Upload,
  Menu,
  X,
  ClipboardList,
  CheckSquare,
  AlertTriangle,
  ChevronLeft,
  Trophy,
} from 'lucide-react';

const STORAGE_KEY = 'grassroots_manager_state_v2';

function initializeDefaultGame(squad: Player[]): Game {
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
  };
}

export default function App() {
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
            return migrated;
          });
        }
      } catch (e) {
        console.error(e);
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

  // Top-level View & Sub-tab State
  const [mainView, setMainView] = useState<'game' | 'games_list' | 'settings'>('game');
  const [gameSubTab, setGameSubTab] = useState<'live' | 'plan' | 'tactics' | 'stats'>('live');

  // Clock Play / Pause state (ephemeral to active match)
  const [isPaused, setIsPaused] = useState<boolean>(true);

  // Native App Wake Lock
  useEffect(() => {
    const manageWakeLock = async () => {
      try {
        if (!isPaused && activeGame?.status === 'in_progress') {
          await KeepAwake.keepAwake();
        } else {
          await KeepAwake.allowSleep();
        }
      } catch (e) {
        // Will fail silently if not running inside Capacitor
      }
    };
    manageWakeLock();
  }, [isPaused, activeGame?.status]);

  // Modals & Interaction State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeAlertPhase, setActiveAlertPhase] = useState<FormationPhase | null>(null);

  // Tactile Pitch Swap State
  const [liveSelectedSlotId, setLiveSelectedSlotId] = useState<string | null>(null);
  const [liveSwapSourceSlotId, setLiveSwapSourceSlotId] = useState<string | null>(null);
  const [selectedBenchPlayerId, setSelectedBenchPlayerId] = useState<string | null>(null);

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

  // Clock Tick Timer (Accurate second-by-second)
  useEffect(() => {
    if (isPaused || !activeGame) return;

    const interval = setInterval(() => {
      setGames(prevGames =>
        prevGames.map(g => {
          if (g.id !== activeGame.id) return g;

          const nextSeconds = g.elapsedSeconds + 1;
          const currentMin = Math.floor(nextSeconds / 60);

          // Check if any scheduled phase is due at this minute
          g.phases.forEach(phase => {
            if (
              phase.targetMinute > 0 &&
              phase.targetMinute === currentMin &&
              nextSeconds % 60 === 0 &&
              !g.executedPhaseIds.includes(phase.id) &&
              activeAlertPhase?.id !== phase.id
            ) {
              setActiveAlertPhase(phase);
            }
          });

          // Update player seconds played / bench
          const onPitchIds = new Set(Object.values(g.activeAssignments).filter(Boolean));
          const updatedStats = { ...g.playerStats };

          players.forEach(p => {
            if (!g.presentPlayerIds.includes(p.id)) return;
            if (!updatedStats[p.id]) {
              updatedStats[p.id] = {
                secondsPlayed: 0,
                secondsOnBench: 0,
                goals: 0,
                assists: 0,
                subIns: 0,
                subOuts: 0,
                currentOnPitch: onPitchIds.has(p.id),
              };
            }
            if (onPitchIds.has(p.id)) {
              updatedStats[p.id].secondsPlayed += 1;
              updatedStats[p.id].currentOnPitch = true;
            } else {
              updatedStats[p.id].secondsOnBench += 1;
              updatedStats[p.id].currentOnPitch = false;
            }
          });

          return {
            ...g,
            elapsedSeconds: nextSeconds,
            playerStats: updatedStats,
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, activeGame?.id, activeAlertPhase, players]);

  // Handle Game Switching
  const handleSelectGame = (gameId: string) => {
    setIsPaused(true);
    setActiveGameId(gameId);
    setLiveSelectedSlotId(null);
    setLiveSwapSourceSlotId(null);
    setSelectedBenchPlayerId(null);
    setActiveAlertPhase(null);
    setMainView('game');
  };

  // Handle Create New Game
  const handleCreateGame = (newGameData: Partial<Game>, copyFromGameId?: string) => {
    setIsPaused(true);
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
    };

    setGames(prev => [newGame, ...prev]);
    setActiveGameId(newGame.id);
    setMainView('game');
    setGameSubTab('tactics');
  };

  // Handle Delete Game
  const handleDeleteGame = (gameId: string) => {
    if (games.length <= 1) {
      alert('Cannot delete the only existing match. Create another one first.');
      return;
    }
    const remaining = games.filter(g => g.id !== gameId);
    setGames(remaining);
    if (activeGameId === gameId) {
      setActiveGameId(remaining[0].id);
      setIsPaused(true);
    }
  };

  // Handle Update Game Status
  const handleUpdateGameStatus = (gameId: string, status: 'upcoming' | 'in_progress' | 'completed') => {
    setGames(prev =>
      prev.map(g => (g.id === gameId ? { ...g, status } : g))
    );
  };

  // Drag-and-Drop Positional Handlers for the Live Pitch
  const handleLiveUpdateSlotPosition = (slotId: string, x: number, y: number) => {
    updateActiveGame(prev => ({
      ...prev,
      customPositions: {
        ...(prev.customPositions || {}),
        [slotId]: { x, y },
      },
    }));
  };

  const handleLiveResetCustomPositions = () => {
    updateActiveGame({ customPositions: undefined });
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

  // Scoreboard Handlers
  const handleTogglePlayPause = () => setIsPaused(prev => !prev);

  const handleAddMinute = (mins: number) => {
    updateActiveGame(prev => ({
      ...prev,
      elapsedSeconds: Math.max(0, prev.elapsedSeconds + mins * 60),
    }));
  };

  const handleEndMatch = () => {
    setIsPaused(true);
    updateActiveGame({ status: 'completed' });
  };

  const handleNextPeriod = () => {
    setIsPaused(true);
    const totalPeriods = activeGame.phases.length;
    if (activeGame.currentPeriod < totalPeriods) {
      const nextP = activeGame.currentPeriod + 1;
      const matchDurMin = activeGame.settings.matchDurationMinutes || 60;
      const periodDurationSeconds = (matchDurMin * 60) / totalPeriods;
      const targetSeconds = activeGame.currentPeriod * periodDurationSeconds;
      const deltaSeconds = Math.max(0, targetSeconds - activeGame.elapsedSeconds);
      
      const onPitchIds = new Set(Object.values(activeGame.activeAssignments).filter(Boolean));
      const updatedStats = { ...activeGame.playerStats };
      
      players.forEach(p => {
        if (!activeGame.presentPlayerIds.includes(p.id)) return;
        if (!updatedStats[p.id]) {
          updatedStats[p.id] = { secondsPlayed: 0, secondsOnBench: 0, goals: 0, assists: 0, subIns: 0, subOuts: 0, currentOnPitch: onPitchIds.has(p.id) };
        }
        if (onPitchIds.has(p.id)) {
          updatedStats[p.id].secondsPlayed += deltaSeconds;
        } else {
          updatedStats[p.id].secondsOnBench += deltaSeconds;
        }
      });

      const newEvent: MatchEvent = {
        id: `period-${Date.now()}`,
        type: 'period_start',
        minute: Math.floor(targetSeconds / 60),
        second: targetSeconds % 60,
        timestamp: Date.now(),
        description: `Period ${nextP} Started`,
      };
      
      updateActiveGame(prev => ({
        ...prev,
        currentPeriod: nextP,
        elapsedSeconds: targetSeconds,
        playerStats: updatedStats,
        events: [...prev.events, newEvent],
      }));
    } else {
      handleEndMatch();
    }
  };

  const handleResetMatch = () => {
    if (confirm('Reset this match clock, score, and events?')) {
      setIsPaused(true);
      setActiveAlertPhase(null);

      const resetStats: Record<string, PlayerMatchStats> = {};
      const initialAssignedIds = new Set(Object.values(activeGame.phases[0]?.assignments || {}));
      players.forEach(p => {
        resetStats[p.id] = {
          secondsPlayed: 0,
          secondsOnBench: 0,
          goals: 0,
          assists: 0,
          subIns: initialAssignedIds.has(p.id) ? 1 : 0,
          subOuts: 0,
          currentOnPitch: initialAssignedIds.has(p.id),
        };
      });

      updateActiveGame({
        elapsedSeconds: 0,
        currentPeriod: 1,
        scoreUs: 0,
        scoreThem: 0,
        events: [],
        executedPhaseIds: [],
        currentFormationId: activeGame.phases[0]?.formationId || DEFAULT_FORMATION_ID,
        activeAssignments: activeGame.phases[0]?.assignments || {},
        customPositions: undefined,
        playerStats: resetStats,
      });
    }
  };

  // Goal & Event Handlers
  const handleSaveGoal = (scorerId: string, assistId?: string, min?: number) => {
    const goalMin = min !== undefined ? min : Math.floor(activeGame.elapsedSeconds / 60);
    const scorer = players.find(p => p.id === scorerId);
    const assist = assistId ? players.find(p => p.id === assistId) : undefined;

    const newEvent: MatchEvent = {
      id: `goal-${Date.now()}`,
      type: 'goal_us',
      minute: goalMin,
      second: activeGame.elapsedSeconds % 60,
      timestamp: Date.now(),
      playerId: scorerId,
      assistPlayerId: assistId,
      description: `GOAL! ${scorer ? scorer.name : 'Unknown'} (#${scorer?.number})`,
      detail: assist ? `Assist: ${assist.name} (#${assist.number})` : undefined,
    };

    updateActiveGame(prev => {
      const updatedStats = { ...prev.playerStats };
      if (updatedStats[scorerId]) {
        updatedStats[scorerId] = {
          ...updatedStats[scorerId],
          goals: (updatedStats[scorerId].goals || 0) + 1,
        };
      }
      if (assistId && updatedStats[assistId]) {
        updatedStats[assistId] = {
          ...updatedStats[assistId],
          assists: (updatedStats[assistId].assists || 0) + 1,
        };
      }

      return {
        ...prev,
        scoreUs: prev.scoreUs + 1,
        playerStats: updatedStats,
        events: [...prev.events, newEvent],
      };
    });
  };

  const handleAddOpponentGoal = () => {
    const min = Math.floor(activeGame.elapsedSeconds / 60);
    const newEvent: MatchEvent = {
      id: `opp-goal-${Date.now()}`,
      type: 'goal_them',
      minute: min,
      second: activeGame.elapsedSeconds % 60,
      timestamp: Date.now(),
      description: `Goal conceded to ${activeGame.settings.opponentName}`,
    };

    updateActiveGame(prev => ({
      ...prev,
      scoreThem: prev.scoreThem + 1,
      events: [...prev.events, newEvent],
    }));
  };

  const handleUndoOpponentGoal = () => {
    if (activeGame.scoreThem > 0) {
      updateActiveGame(prev => {
        const oppEvents = prev.events.filter(e => e.type === 'goal_them');
        const lastOpp = oppEvents[oppEvents.length - 1];
        return {
          ...prev,
          scoreThem: prev.scoreThem - 1,
          events: lastOpp ? prev.events.filter(e => e.id !== lastOpp.id) : prev.events,
        };
      });
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    const evt = activeGame.events.find(e => e.id === eventId);
    if (!evt) return;

    updateActiveGame(prev => {
      let nextScoreUs = prev.scoreUs;
      let nextScoreThem = prev.scoreThem;
      const updatedStats = { ...prev.playerStats };

      if (evt.type === 'goal_us' && nextScoreUs > 0) {
        nextScoreUs -= 1;
        if (evt.playerId && updatedStats[evt.playerId]) {
          updatedStats[evt.playerId].goals = Math.max(0, updatedStats[evt.playerId].goals - 1);
        }
      } else if (evt.type === 'goal_them' && nextScoreThem > 0) {
        nextScoreThem -= 1;
      }

      return {
        ...prev,
        scoreUs: nextScoreUs,
        scoreThem: nextScoreThem,
        playerStats: updatedStats,
        events: prev.events.filter(e => e.id !== eventId),
      };
    });
  };

  // Phase Substitution Handlers
  const handleApplyPhase = (phase: FormationPhase) => {
    const diff = calculatePhaseDiff(
      activeGame.activeAssignments,
      phase.assignments,
      activeGame.currentFormationId,
      phase.formationId,
      players
    );

    const min = Math.floor(activeGame.elapsedSeconds / 60);
    const newEvents: MatchEvent[] = [];

    diff.subIns.forEach((inP, idx) => {
      const outP = diff.subOuts[idx];
      newEvents.push({
        id: `sub-${Date.now()}-${inP.id}`,
        type: 'sub',
        minute: min,
        second: activeGame.elapsedSeconds % 60,
        timestamp: Date.now() + idx,
        playerId: inP.id,
        subOutPlayerId: outP ? outP.id : undefined,
        description: outP
          ? `Sub: #${inP.number} ${inP.name} IN ↔ #${outP.number} ${outP.name} OUT`
          : `Sub: #${inP.number} ${inP.name} came on`,
        detail: `Phase "${phase.name}" applied`,
      });
    });

    if (diff.formationChanged) {
      newEvents.push({
        id: `form-${Date.now()}`,
        type: 'formation_change',
        minute: min,
        second: activeGame.elapsedSeconds % 60,
        timestamp: Date.now() + 10,
        description: `Formation changed to ${getFormationById(phase.formationId).name.split(' ')[0]}`,
      });
    }

    updateActiveGame(prev => ({
      ...prev,
      currentFormationId: phase.formationId,
      activeAssignments: { ...phase.assignments },
      customPositions: phase.customPositions ? { ...phase.customPositions } : undefined,
      executedPhaseIds: prev.executedPhaseIds.includes(phase.id)
        ? prev.executedPhaseIds
        : [...prev.executedPhaseIds, phase.id],
      events: [...prev.events, ...newEvents],
    }));

    setActiveAlertPhase(null);
  };

  // Live Slot Click (Tap-to-Swap & Assign)
  const handleLiveSlotClick = (slotId: string) => {
    if (liveSwapSourceSlotId) {
      if (liveSwapSourceSlotId === slotId) {
        setLiveSwapSourceSlotId(null);
      } else {
        // Swap positions of two players on the pitch
        updateActiveGame(prev => {
          const updated = { ...prev.activeAssignments };
          const p1 = updated[liveSwapSourceSlotId];
          const p2 = updated[slotId];
          if (p2) updated[liveSwapSourceSlotId] = p2;
          else delete updated[liveSwapSourceSlotId];
          if (p1) updated[slotId] = p1;
          else delete updated[slotId];

          return { ...prev, activeAssignments: updated };
        });

        setLiveSwapSourceSlotId(null);
        setLiveSelectedSlotId(null);
      }
    } else if (selectedBenchPlayerId) {
      // Sub selected bench player into this slot
      const currentSlotPlayerId = activeGame.activeAssignments[slotId];
      const benchPlayer = players.find(p => p.id === selectedBenchPlayerId);
      const offPlayer = currentSlotPlayerId ? players.find(p => p.id === currentSlotPlayerId) : undefined;

      const min = Math.floor(activeGame.elapsedSeconds / 60);

      updateActiveGame(prev => {
        const updated = { ...prev.activeAssignments };
        updated[slotId] = selectedBenchPlayerId;

        const subEvent: MatchEvent = {
          id: `quick-sub-${Date.now()}`,
          type: 'sub',
          minute: min,
          second: prev.elapsedSeconds % 60,
          timestamp: Date.now(),
          playerId: benchPlayer?.id,
          subOutPlayerId: offPlayer?.id,
          description: offPlayer && benchPlayer
            ? `Sub: #${benchPlayer.number} ${benchPlayer.name} IN ↔ #${offPlayer.number} ${offPlayer.name} OUT`
            : `Sub: #${benchPlayer?.number} ${benchPlayer?.name} on pitch`,
          detail: `Tactical sub at min ${min}'`,
        };

        return {
          ...prev,
          activeAssignments: updated,
          events: [...prev.events, subEvent],
        };
      });

      setSelectedBenchPlayerId(null);
      setLiveSelectedSlotId(null);
    } else {
      setLiveSelectedSlotId(slotId);
      setLiveSwapSourceSlotId(slotId);
    }
  };

  // Live Bench Click
  const handleLiveBenchClick = (playerId: string) => {
    if (liveSwapSourceSlotId) {
      const currentSlotPlayerId = activeGame.activeAssignments[liveSwapSourceSlotId];
      const benchPlayer = players.find(p => p.id === playerId);
      const offPlayer = currentSlotPlayerId ? players.find(p => p.id === currentSlotPlayerId) : undefined;
      const min = Math.floor(activeGame.elapsedSeconds / 60);

      updateActiveGame(prev => {
        const updated = { ...prev.activeAssignments };
        updated[liveSwapSourceSlotId] = playerId;

        const subEvent: MatchEvent = {
          id: `quick-sub-${Date.now()}`,
          type: 'sub',
          minute: min,
          second: prev.elapsedSeconds % 60,
          timestamp: Date.now(),
          playerId: benchPlayer?.id,
          subOutPlayerId: offPlayer?.id,
          description: offPlayer && benchPlayer
            ? `Sub: #${benchPlayer.number} ${benchPlayer.name} IN ↔ #${offPlayer.number} ${offPlayer.name} OUT`
            : `Sub: #${benchPlayer?.number} ${benchPlayer?.name} on pitch`,
          detail: `Tactical rotation at min ${min}'`,
        };

        return {
          ...prev,
          activeAssignments: updated,
          events: [...prev.events, subEvent],
        };
      });

      setLiveSwapSourceSlotId(null);
      setLiveSelectedSlotId(null);
      setSelectedBenchPlayerId(null);
    } else {
      setSelectedBenchPlayerId(prev => (prev === playerId ? null : playerId));
    }
  };

  // Handle Execute Recommended Next Substitution
  const handleExecuteRecommendedSwap = (slotId: string, subInPlayerId: string, subOutPlayerId: string) => {
    const subInPlayer = players.find(p => p.id === subInPlayerId);
    const subOutPlayer = players.find(p => p.id === subOutPlayerId);
    const slot = currentFormation.slots.find(s => s.id === slotId);
    const min = Math.floor(activeGame.elapsedSeconds / 60);

    updateActiveGame(prev => {
      const updated = { ...prev.activeAssignments };
      updated[slotId] = subInPlayerId;

      const subEvent: MatchEvent = {
        id: `rec-sub-${Date.now()}`,
        type: 'sub',
        minute: min,
        second: prev.elapsedSeconds % 60,
        timestamp: Date.now(),
        playerId: subInPlayerId,
        subOutPlayerId: subOutPlayerId,
        description: `Sub: #${subInPlayer?.number} ${subInPlayer?.name} IN ↔ #${subOutPlayer?.number} ${subOutPlayer?.name} OUT`,
        detail: `Fair-play rotation recommendation (${slot?.label || 'Slot'}) at min ${min}'`,
      };

      return {
        ...prev,
        activeAssignments: updated,
        events: [...prev.events, subEvent],
      };
    });

    setLiveSwapSourceSlotId(null);
    setLiveSelectedSlotId(null);
    setSelectedBenchPlayerId(null);
  };

  // Active players and bench lists
  const currentFormation = getFormationById(activeGame.currentFormationId);
  const assignedPlayerIds = new Set(Object.values(activeGame.activeAssignments).filter(Boolean));
  const onPitchPlayers = players.filter(p => assignedPlayerIds.has(p.id));
  const benchPlayers = players.filter(p => activeGame.presentPlayerIds.includes(p.id) && !assignedPlayerIds.has(p.id));

  // Upcoming scheduled phase for banner
  const currentMinute = Math.floor(activeGame.elapsedSeconds / 60);
  const nextScheduledPhase = activeGame.phases
    .filter(p => p.targetMinute > currentMinute && !activeGame.executedPhaseIds.includes(p.id))
    .sort((a, b) => a.targetMinute - b.targetMinute)[0];

  const handleToggleAttendance = (playerId: string) => {
    updateActiveGame(prev => {
      const isCurrentlyPresent = prev.presentPlayerIds.includes(playerId);
      const newIds = isCurrentlyPresent 
        ? prev.presentPlayerIds.filter(id => id !== playerId)
        : [...prev.presentPlayerIds, playerId];
      return { ...prev, presentPlayerIds: newIds };
    });
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white select-none">
      {/* Navigation Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-left">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-black text-lg text-white leading-tight">FC Manager</h2>
                  <span className="text-[11px] text-emerald-400 font-semibold">U12 Grassroots Hub</span>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 -mr-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
              {/* SECTION 1: GAMES & MATCHDAYS */}
              <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-2">
                Games & Matchdays
              </p>

              <button
                onClick={() => {
                  setMainView('games_list');
                  setIsDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all ${
                  mainView === 'games_list'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-left">
                    <div>All Matches & Season</div>
                    <div className="text-[10px] text-slate-400 font-normal">History, schedule, and stats</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                  {games.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setMainView('game');
                  setIsDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all ${
                  mainView === 'game'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="truncate">vs {activeGame.opponentName}</div>
                    <div className="text-[10px] text-slate-400 font-normal">Active Game Workspace</div>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    activeGame.status === 'in_progress'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : activeGame.status === 'completed'
                      ? 'bg-slate-800 text-slate-400 border border-slate-700'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {activeGame.status === 'in_progress'
                    ? '● Live'
                    : activeGame.status === 'completed'
                    ? 'Finished'
                    : 'Upcoming'}
                </span>
              </button>

              {/* SECTION 2: SETTINGS & ROSTER */}
              <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-6">
                Settings & Roster
              </p>

              <button
                onClick={() => {
                  setMainView('settings');
                  setIsDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all ${
                  mainView === 'settings'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-left">
                    <div>Global Squad Roster</div>
                    <div className="text-[10px] text-slate-400 font-normal">Add/edit club players</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                  {players.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setMainView('games_list');
                  setIsDrawerOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
              >
                <Plus className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-left">
                  <div>Schedule New Match</div>
                  <div className="text-[10px] text-slate-400 font-normal">Set opponent, date, and venue</div>
                </div>
              </button>
            </div>

            <div className="p-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setIsExportModalOpen(true);
                  setIsDrawerOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-sm border border-slate-700 transition-all active:scale-95"
              >
                <Share2 className="w-4 h-4 text-emerald-400" /> Share Match Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 backdrop-blur-xl px-4 sm:px-6 py-3 shadow-md pt-[env(safe-area-inset-top,12px)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Burger Menu & Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Open Navigation Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-base sm:text-lg tracking-tight text-white">
                  Grassroots FC
                </h1>
                {mainView === 'game' && (
                  <span
                    className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                      activeGame.status === 'in_progress'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : activeGame.status === 'completed'
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {activeGame.status === 'in_progress'
                      ? '● Live'
                      : activeGame.status === 'completed'
                      ? 'Finished'
                      : 'Upcoming'}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>{activeGame.settings.teamName}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">{activeGame.settings.format}</span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {mainView === 'game' ? (
              <>
                <button
                  onClick={() => setMainView('games_list')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-white border border-slate-700 shadow-md transition-all active:scale-95 text-xs font-semibold"
                  title="View All Matches"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">All</span> Matches
                </button>

                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition-all active:scale-95 shadow"
                  title="Share Match Report"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Report</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setMainView('game')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all active:scale-95 text-xs font-bold"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Return to Match</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Scheduled Substitution Alert Popover */}
      {activeAlertPhase && (
        <SubstitutionAlert
          phase={activeAlertPhase}
          currentAssignments={activeGame.activeAssignments}
          currentFormationId={activeGame.currentFormationId}
          players={players}
          onApply={() => handleApplyPhase(activeAlertPhase)}
          onDismiss={() => {
            updateActiveGame(prev => ({
              ...prev,
              executedPhaseIds: [...prev.executedPhaseIds, activeAlertPhase.id],
            }));
            setActiveAlertPhase(null);
          }}
        />
      )}

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* ================= VIEW 1: MATCHES & SEASON HUB ================= */}
        {mainView === 'games_list' && (
          <GamesListView
            games={games}
            activeGameId={activeGame.id}
            onSelectGame={handleSelectGame}
            onCreateGame={handleCreateGame}
            onDeleteGame={handleDeleteGame}
            players={players}
          />
        )}

        {/* ================= VIEW 2: GLOBAL SETTINGS & ROSTER ================= */}
        {mainView === 'settings' && (
          <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in">
            {/* Global Squad Roster */}
            <SquadManager players={players} onUpdatePlayers={setPlayers} />

            {/* Quick Action: Schedule Match */}
            <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-base">Schedule Next Match</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ready for the next game? Set up a new fixture with date, opponent, and venue.
                </p>
              </div>
              <button
                onClick={() => setMainView('games_list')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" /> Go to Match Scheduler
              </button>
            </div>

            {/* Data Storage & Backup Section */}
            <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-white text-base">Data Storage & Device Backup</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                All match plans, player stats, rosters, and game history are saved locally in your browser's persistent storage (<code className="text-emerald-400 font-mono text-[11px]">localStorage</code>). This guarantees 100% offline functionality at the pitch without cellular signal.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <button
                  onClick={handleExportBackup}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" /> Export Backup (.json)
                </button>

                <label className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 cursor-pointer transition-all active:scale-95">
                  <Upload className="w-4 h-4 text-emerald-400" /> Restore from Backup (.json)
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW 3: UNIFIED GAME WORKSPACE ================= */}
        {mainView === 'game' && (
          <div className="space-y-6 animate-in fade-in">
            {/* FINISHED GAME WARNING BANNER */}
            {activeGame.status === 'completed' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-white flex items-center gap-2">
                      <span>Match Finished</span>
                      <span className="font-mono text-amber-400">
                        ({activeGame.scoreUs} - {activeGame.scoreThem})
                      </span>
                    </p>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      You are updating a completed game. Any changes to lineups, tactics, or attendance will modify historical match records.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => updateActiveGame({ status: 'in_progress' })}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all active:scale-95 shrink-0 self-end sm:self-center"
                >
                  Reopen Match
                </button>
              </div>
            )}

            {/* UNIFIED GAME MODERN SUB-TABS */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto no-scrollbar shadow-lg">
              <button
                onClick={() => setGameSubTab('live')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  gameSubTab === 'live'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Activity className="w-4 h-4" /> Matchday Live
              </button>

              <button
                onClick={() => setGameSubTab('plan')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  gameSubTab === 'plan'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Layers className="w-4 h-4" /> Game Plan (Rotations)
              </button>

              <button
                onClick={() => setGameSubTab('tactics')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  gameSubTab === 'tactics'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Shield className="w-4 h-4" /> Tactics & Attendance ({activeGame.presentPlayerIds.length})
              </button>

              <button
                onClick={() => setGameSubTab('stats')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  gameSubTab === 'stats'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Clock className="w-4 h-4" /> Playing Time & Fair Play
              </button>
            </div>

            {/* --- SUB-TAB 1: MATCHDAY LIVE --- */}
            {gameSubTab === 'live' && (
              <div className="space-y-6 animate-in fade-in">
                {/* Live Scoreboard */}
                <LiveScoreboard
                  settings={activeGame.settings}
                  scoreUs={activeGame.scoreUs}
                  scoreThem={activeGame.scoreThem}
                  elapsedSeconds={activeGame.elapsedSeconds}
                  isPaused={isPaused}
                  currentPeriod={activeGame.currentPeriod}
                  totalPeriods={activeGame.phases.length}
                  onTogglePlayPause={handleTogglePlayPause}
                  onAddMinute={handleAddMinute}
                  onNextPeriod={handleNextPeriod}
                  onEndMatch={handleEndMatch}
                  onResetMatch={handleResetMatch}
                  onOpenGoalModal={() => setIsGoalModalOpen(true)}
                  onAddOpponentGoal={handleAddOpponentGoal}
                  onUndoOpponentGoal={handleUndoOpponentGoal}
                  nextScheduledPhase={nextScheduledPhase}
                />

                {/* RECOMMENDED NEXT SUBSTITUTION BANNER */}
                <NextSubstitutionBanner
                  onPitchPlayers={onPitchPlayers}
                  benchPlayers={benchPlayers}
                  playerStats={activeGame.playerStats}
                  activeAssignments={activeGame.activeAssignments}
                  formation={currentFormation}
                  onExecuteSwap={handleExecuteRecommendedSwap}
                  nextScheduledPhase={nextScheduledPhase}
                />

                {/* Pitch & Bench Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Pitch Visualizer with Drag & Drop */}
                  <div className="lg:col-span-7 flex flex-col items-center">
                    <div className="w-full max-w-xl flex items-center justify-between mb-2 px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <Shield className="w-4 h-4" /> Formation:
                        </span>
                        <span className="text-xs font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                          {currentFormation.name}
                        </span>
                      </div>

                      {(liveSwapSourceSlotId || selectedBenchPlayerId) && (
                        <button
                          onClick={() => {
                            setLiveSwapSourceSlotId(null);
                            setLiveSelectedSlotId(null);
                            setSelectedBenchPlayerId(null);
                          }}
                          className="text-xs text-rose-400 hover:text-rose-300 font-semibold underline"
                        >
                          Cancel Swap
                        </button>
                      )}
                    </div>

                    <Pitch
                      formation={currentFormation}
                      assignments={activeGame.activeAssignments}
                      customPositions={activeGame.customPositions}
                      onUpdateSlotPosition={handleLiveUpdateSlotPosition}
                      onResetCustomPositions={handleLiveResetCustomPositions}
                      players={players}
                      playerStats={activeGame.playerStats}
                      selectedSlotId={liveSelectedSlotId}
                      onSelectSlot={handleLiveSlotClick}
                      swapSourceSlotId={liveSwapSourceSlotId}
                      showPlayingTime={true}
                    />

                    <div className="mt-2 text-center text-xs text-slate-400 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Drag players to shift positions • Tap player to swap or sub from bench
                      </span>
                    </div>
                  </div>

                  {/* Bench & Match Timeline */}
                  <div className="lg:col-span-5 space-y-6">
                    <Bench
                      benchPlayers={benchPlayers}
                      playerStats={activeGame.playerStats}
                      selectedPlayerId={selectedBenchPlayerId}
                      onSelectBenchPlayer={handleLiveBenchClick}
                      targetMinutes={activeGame.settings.targetFairMinutesPerPlayer}
                      isSwapMode={Boolean(liveSwapSourceSlotId)}
                    />

                    <EventTimeline
                      events={activeGame.events}
                      players={players}
                      onDeleteEvent={handleDeleteEvent}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- SUB-TAB 2: GAME PLAN (ROTATIONS) --- */}
            {gameSubTab === 'plan' && (
              <div className="animate-in fade-in">
                <FormationPlanManager
                  phases={activeGame.phases}
                  onUpdatePhases={updatedPhases => updateActiveGame({ phases: updatedPhases })}
                  players={players}
                  presentPlayerIds={activeGame.presentPlayerIds}
                  playerStats={activeGame.playerStats}
                  onApplyPhaseToLive={handleApplyPhase}
                  isLiveMatchRunning={!isPaused}
                  currentMatchMinute={currentMinute}
                  matchDurationMinutes={activeGame.settings.matchDurationMinutes || 60}
                />
              </div>
            )}

            {/* --- SUB-TAB 3: TACTICS & ATTENDANCE --- */}
            {gameSubTab === 'tactics' && (
              <div className="animate-in fade-in">
                <GameTacticsTab
                  game={activeGame}
                  players={players}
                  onUpdateGame={updateActiveGame}
                  onToggleAttendance={handleToggleAttendance}
                />
              </div>
            )}

            {/* --- SUB-TAB 4: PLAYING TIME & FAIR PLAY --- */}
            {gameSubTab === 'stats' && (
              <div className="animate-in fade-in">
                <PlayingTimeStats
                  players={players}
                  presentPlayerIds={activeGame.presentPlayerIds}
                  playerStats={activeGame.playerStats}
                  targetMinutes={activeGame.settings.targetFairMinutesPerPlayer}
                  totalMatchSeconds={activeGame.elapsedSeconds}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Goal Recording Modal */}
      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSaveGoal={handleSaveGoal}
        onPitchPlayers={onPitchPlayers}
        allPlayers={players}
        currentMinute={currentMinute}
      />

      {/* Export / Share Summary Modal */}
      <ExportSummaryModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        settings={activeGame.settings}
        scoreUs={activeGame.scoreUs}
        scoreThem={activeGame.scoreThem}
        elapsedSeconds={activeGame.elapsedSeconds}
        players={players}
        presentPlayerIds={activeGame.presentPlayerIds}
        playerStats={activeGame.playerStats}
        events={activeGame.events}
      />
    </div>
  );
}
