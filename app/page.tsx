'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/auth'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  ArrowRight,
  Bug,
  Sparkles,
  Zap,
  Hammer,
  Trophy,
  Clock,
  ChevronUp,
  Flame,
  Star,
  Shield,
  Rocket,
  Calendar,
  TimerReset,
  Hourglass
} from 'lucide-react'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

type ChangelogType = "feature" | "bugfix" | "improvement" | "breaking" | "security" | "performance" | "hotfix" | "deprecation";

type ChangelogEntry = {
  text: string;
  type: ChangelogType;
  difficulty: number;
  tricky?: boolean;
  critical?: boolean; // Added critical flag for time-sensitive entries
  points?: number; // Custom point value for special entries
};

// Changelog entry types (expanded)
const CHANGE_TYPES = [
  { type: 'feature', icon: Sparkles, color: 'text-green-500', label: 'Feature' },
  { type: 'bugfix', icon: Bug, color: 'text-red-500', label: 'Bug Fix' },
  { type: 'improvement', icon: Zap, color: 'text-blue-500', label: 'Improvement' },
  { type: 'breaking', icon: Hammer, color: 'text-orange-500', label: 'Breaking Change' },
  { type: 'security', icon: Shield, color: 'text-purple-500', label: 'Security' },
  { type: 'performance', icon: Rocket, color: 'text-yellow-500', label: 'Performance' },
  { type: 'hotfix', icon: Flame, color: 'text-rose-500', label: 'Hotfix' }, // New entry type
  { type: 'deprecation', icon: Hourglass, color: 'text-slate-500', label: 'Deprecation' }, // New entry type
]

// Expanded changelog entries for the game with different difficulty levels
const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  // Easy
  { text: "Added dark mode support", type: "feature", difficulty: 1 },
  { text: "Fixed login screen crash", type: "bugfix", difficulty: 1 },
  { text: "Enhanced loading performance", type: "improvement", difficulty: 1 },
  { text: "Removed deprecated API endpoint", type: "breaking", difficulty: 1 },
  { text: "Patched XSS vulnerability", type: "security", difficulty: 1 },
  { text: "Optimized image loading", type: "performance", difficulty: 1 },
  { text: "Emergency fix for payment processing bug", type: "hotfix", difficulty: 1 },
  { text: "Legacy authentication method marked for removal", type: "deprecation", difficulty: 1 },

  // Medium
  { text: "Introduced experimental voice commands", type: "feature", difficulty: 2 },
  { text: "Resolved intermittent data synchronization issues", type: "bugfix", difficulty: 2 },
  { text: "Refined mobile responsiveness", type: "improvement", difficulty: 2 },
  { text: "Modified authentication flow requiring re-login", type: "breaking", difficulty: 2 },
  { text: "Enhanced encryption for sensitive data fields", type: "security", difficulty: 2 },
  { text: "Reduced database query execution time by 40%", type: "performance", difficulty: 2 },
  { text: "Critical patch for data loss during export", type: "hotfix", difficulty: 2, critical: true, points: 250 },
  { text: "Legacy theme engine will be removed next month", type: "deprecation", difficulty: 2 },

  // Hard
  { text: "Implemented AI-assisted content suggestions in editor", type: "feature", difficulty: 3 },
  { text: "Fixed edge case causing incorrect date calculations near timezone boundaries", type: "bugfix", difficulty: 3 },
  { text: "Revamped information architecture for clearer navigation hierarchies", type: "improvement", difficulty: 3 },
  { text: "Changed data export format from XML to JSON with different schema", type: "breaking", difficulty: 3 },
  { text: "Implemented OWASP recommended protection against CSRF attacks", type: "security", difficulty: 3 },
  { text: "Enabled parallel processing for batch operations reducing wait time by 75%", type: "performance", difficulty: 3 },
  { text: "Urgent patch for zero-day vulnerability in authentication flow", type: "hotfix", difficulty: 3, critical: true, points: 400 },
  { text: "Legacy plugin architecture marked for sunset in 90 days", type: "deprecation", difficulty: 3 },

  // Tricky ones
  { text: "Added view customization panel", type: "feature", difficulty: 2, tricky: true },  // Sounds like improvement
  { text: "Updated error handling in network layer", type: "improvement", difficulty: 2, tricky: true },  // Could be bugfix
  { text: "Refactored authentication module for security enhancements", type: "security", difficulty: 3, tricky: true },  // Could be improvement
  { text: "Optimized rendering engine", type: "improvement", difficulty: 2, tricky: true },  // Could be performance
  { text: "Fixed critical memory usage in background tasks", type: "performance", difficulty: 3, tricky: true },  // Could be bugfix
  { text: "Upgraded to TLS 1.3 with legacy fallback option", type: "security", difficulty: 3, tricky: true },  // Could be improvement or breaking

  // New super tricky ones
  { text: "Increased logging verbosity for failed API requests", type: "improvement", difficulty: 3, tricky: true }, // Could be bugfix or feature
  { text: "Server-side implementation of form validation rules", type: "security", difficulty: 3, tricky: true }, // Could be feature or improvement
  { text: "Emergency release to resolve payment gateway timeout", type: "hotfix", difficulty: 3, tricky: true, critical: true, points: 350 }, // Sounds like bugfix or performance
  { text: "Legacy configuration format will no longer be supported", type: "deprecation", difficulty: 3, tricky: true }, // Could be breaking

  // Special "Daily Challenge" entries
  { text: "Migrated from React class components to functional hooks", type: "improvement", difficulty: 3, points: 300 },
  { text: "Added accessibility enhancements for screen readers", type: "feature", difficulty: 2, points: 250 },
  { text: "Fixed critical race condition in concurrent data updates", type: "bugfix", difficulty: 3, critical: true, points: 350 },
  { text: "Completely redesigned UI with new component library", type: "breaking", difficulty: 3, points: 300 },
  { text: "Implemented Zero Trust security architecture", type: "security", difficulty: 3, points: 300 },
  { text: "Redesigned database schema for 10x query performance", type: "performance", difficulty: 3, points: 300 },
]

// Added daily challenge entries
const DAILY_CHALLENGE_ENTRIES: ChangelogEntry[] = [
  { text: "Migrated to React Server Components", type: "breaking", difficulty: 3, points: 400 },
  { text: "Added end-to-end encryption for all communication", type: "security", difficulty: 3, points: 400 },
  { text: "Implemented streaming updates to reduce initial load time by 90%", type: "performance", difficulty: 3, points: 400 },
  { text: "Fixed CVE-2025-4587 affecting user authentication", type: "hotfix", difficulty: 3, critical: true, points: 500 },
  { text: "Added AI-powered code completion", type: "feature", difficulty: 3, points: 400 },
  { text: "Final notice: Legacy API v1 endpoints shutting down next week", type: "deprecation", difficulty: 3, points: 400 },
]

export default function Home() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [gameActive, setGameActive] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [timeLeft, setTimeLeft] = useState(10)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [combo, setCombo] = useState(0)
  const [level, setLevel] = useState(1)
  const [currentEntry, setCurrentEntry] = useState<ChangelogEntry | null>(null);
  const [powerUp, setPowerUp] = useState<string | null>(null)
  const [powerUpTimeLeft, setPowerUpTimeLeft] = useState(0)
  const [perfectRound, setPerfectRound] = useState(false)
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([])
  const [showFinalScore, setShowFinalScore] = useState(false)

  // New states
  const [gameMode, setGameMode] = useState<"classic" | "daily" | "blitz">("classic")
  const [streakBreakerActive, setStreakBreakerActive] = useState(false)
  const [criticalEntryActive, setCriticalEntryActive] = useState(false)
  const [dailyChallengeAvailable, setDailyChallengeAvailable] = useState(false)
  const [dailyChallengeCompleted, setDailyChallengeCompleted] = useState(false)
  const [showGameModeSelect, setShowGameModeSelect] = useState(false)
  const [criticalTimeLeft, setCriticalTimeLeft] = useState(0)
  const [criticalTimerRef, setCriticalTimerRef] = useState<NodeJS.Timeout | null>(null)
  const [longestStreak, setLongestStreak] = useState(0)

  // Particle effect state
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    opacity: number;
  }>>([])

  // Trigger particle effects
  const triggerParticles = (count: number, type: string, isLevelUp: boolean = false) => {
    // Get type-specific colors based on the entry type
    const getTypeColor = (type: string) => {
      const typeColors: Record<string, string[]> = {
        'feature': ['#34D399', '#10B981', '#059669'],
        'bugfix': ['#F87171', '#EF4444', '#DC2626'],
        'improvement': ['#60A5FA', '#3B82F6', '#2563EB'],
        'breaking': ['#F59E0B', '#D97706', '#B45309'],
        'security': ['#A78BFA', '#8B5CF6', '#7C3AED'],
        'performance': ['#FBBF24', '#F59E0B', '#D97706'],
        'hotfix': ['#FB7185', '#E11D48', '#BE123C'],
        'deprecation': ['#94A3B8', '#64748B', '#475569']
      };

      return typeColors[type] || ['#9CA3AF', '#6B7280', '#4B5563'];
    };

    const typeColors = getTypeColor(type);
    const levelUpColors = ['#FBBF24', '#F59E0B', '#FBBF24', '#F87171', '#34D399', '#60A5FA'];

    // Generate random particles with physics
    const newParticles = Array.from({ length: count }).map((_, i) => {
      // Randomize velocity for different spread patterns
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + (isLevelUp ? 5 : 2);
      const size = Math.random() * (isLevelUp ? 20 : 12) + 6;

      return {
        id: Date.now() + i,
        x: 50, // center X position (%)
        y: 50, // center Y position (%)
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color: isLevelUp
            ? levelUpColors[Math.floor(Math.random() * levelUpColors.length)]
            : typeColors[Math.floor(Math.random() * typeColors.length)],
        rotation: Math.random() * 360,
        opacity: 1
      };
    });

    setParticles(prev => [...prev, ...newParticles]);

    // Clean up particles after animation completes
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
    }, 2000);
  };

  // Secret unlock pattern tracking
  const [clickSequence, setClickSequence] = useState<number[]>([])
  const [lastClickTime, setLastClickTime] = useState(0)
  const [shiftPressed, setShiftPressed] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const powerUpTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Secret unlock pattern - extremely specific
  // Users must click on specific parts of error message while holding shift key
  // in a precise sequence: center-top-right-left-center-bottom
  const handleSecretClick = (position: number) => {
    if (!shiftPressed) {
      // Must hold shift key for pattern to work
      setClickSequence([])
      return
    }

    const now = Date.now()
    const elapsed = now - lastClickTime
    setLastClickTime(now)

    // Reset pattern if too much time elapsed (2 seconds between clicks)
    if (elapsed > 2000 && clickSequence.length > 0) {
      setClickSequence([])
      return
    }

    // Add to sequence
    const newSequence = [...clickSequence, position]
    setClickSequence(newSequence)

    // Check if sequence matches the secret pattern: 0-1-2-3-0-4
    const secretPattern = [0, 1, 2, 3, 0, 4]
    const isMatch = newSequence.length === secretPattern.length &&
        newSequence.every((val, idx) => val === secretPattern[idx])

    if (isMatch) {
      unlockGame()
      setClickSequence([])
    } else if (newSequence.length >= secretPattern.length) {
      // Reset if sequence is wrong but same length
      setClickSequence([])
    }
  }

  // Track shift key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(false)
        setClickSequence([]) // Reset sequence when shift is released
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const unlockGame = () => {
    setGameActive(true)
    toast({
      title: "Changelog Hero Unlocked!",
      description: "You found the secret game! How did you do that?",
    })
  }

  // Check if daily challenge is available - based on the current day
  useEffect(() => {
    const checkDailyChallenge = () => {
      const today = new Date().toDateString();
      const lastPlayed = localStorage.getItem('changelogHeroDailyDate');

      setDailyChallengeAvailable(lastPlayed !== today);
      setDailyChallengeCompleted(lastPlayed === today);
    };

    checkDailyChallenge();

    // Check daily challenge availability every minute
    const interval = setInterval(checkDailyChallenge, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load high score from localStorage
  useEffect(() => {
    const savedHighScore = localStorage.getItem('changelogHeroHighScore')
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore))
    }

    const savedAchievements = localStorage.getItem('changelogHeroAchievements')
    if (savedAchievements) {
      setUnlockedAchievements(JSON.parse(savedAchievements))
    }

    const savedLongestStreak = localStorage.getItem('changelogHeroLongestStreak')
    if (savedLongestStreak) {
      setLongestStreak(parseInt(savedLongestStreak))
    }

    return () => {
      cleanup()
    }
  }, [])

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (powerUpTimerRef.current) clearInterval(powerUpTimerRef.current)
    if (criticalTimerRef) clearInterval(criticalTimerRef)
  }

  // Main game logic
  const startGame = (mode: "classic" | "daily" | "blitz" = "classic") => {
    setGameMode(mode);
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setLives(mode === "blitz" ? 1 : 3);
    setTimeLeft(mode === "blitz" ? 6 : 10);
    setCombo(0);
    setLevel(1);
    setPowerUp(null);
    setPowerUpTimeLeft(0);
    setPerfectRound(true);
    setShowFinalScore(false);
    setStreakBreakerActive(false);
    setCriticalEntryActive(false);

    if (mode === "daily") {
      // Set a timestamp to prevent replay of daily challenge
      localStorage.setItem('changelogHeroDailyDate', new Date().toDateString());
      setDailyChallengeAvailable(false);
      setDailyChallengeCompleted(true);
    }

    pickRandomEntry();

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        // In blitz mode, time doesn't reset on correct answers
        // but you get +1 second for each correct answer
        if (prev <= 1) {
          handleWrongAnswer();
          return getTimerDuration();
        }
        return prev - 1;
      })
    }, 1000);
  }

  const endGame = () => {
    cleanup();

    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('changelogHeroHighScore', score.toString());
    }

    if (combo > longestStreak) {
      setLongestStreak(combo);
      localStorage.setItem('changelogHeroLongestStreak', combo.toString());
    }

    setGameOver(true);
    setShowFinalScore(true);
    checkAchievements();
  }

  const checkAchievements = () => {
    const newAchievements = [...unlockedAchievements];
    let changed = false;

    // Check different conditions for achievements
    if (!newAchievements.includes("Changelog Novice") && score >= 500) {
      newAchievements.push("Changelog Novice");
      changed = true;
    }

    if (!newAchievements.includes("Perfect Round") && perfectRound) {
      newAchievements.push("Perfect Round");
      changed = true;
    }

    if (!newAchievements.includes("Speed Demon") && combo >= 5) {
      newAchievements.push("Speed Demon");
      changed = true;
    }

    if (!newAchievements.includes("Changelog Master") && score >= 2000) {
      newAchievements.push("Changelog Master");
      changed = true;
    }

    // New achievements
    if (!newAchievements.includes("Hotfix Hero") && gameMode === "blitz" && score >= 1000) {
      newAchievements.push("Hotfix Hero");
      changed = true;
    }

    if (!newAchievements.includes("Daily Devotion") && gameMode === "daily" && score >= 1500) {
      newAchievements.push("Daily Devotion");
      changed = true;
    }

    if (!newAchievements.includes("Streak Master") && combo >= 10) {
      newAchievements.push("Streak Master");
      changed = true;
    }

    if (!newAchievements.includes("Critical Response") &&
        CHANGELOG_ENTRIES.some(entry => entry.critical && entry.type === "hotfix")) {
      newAchievements.push("Critical Response");
      changed = true;
    }

    // Save achievements
    if (changed) {
      setUnlockedAchievements(newAchievements);
      localStorage.setItem('changelogHeroAchievements', JSON.stringify(newAchievements));
    }
  }

  // Get timer duration based on current level and game mode
  const getTimerDuration = () => {
    if (gameMode === "blitz") {
      return 6; // Fixed time for blitz mode
    }

    const baseDuration = 10;
    return Math.max(4, baseDuration - (level - 1));
  }

  // Pick a random changelog entry based on current level
  const pickRandomEntry = () => {
    let eligibleEntries;

    // For daily challenge, use the daily entries
    if (gameMode === "daily") {
      eligibleEntries = DAILY_CHALLENGE_ENTRIES;
    } else {
      // For classic and blitz modes, filter entries by difficulty matching current level
      eligibleEntries = CHANGELOG_ENTRIES.filter(entry => entry.difficulty <= level);

      // In blitz mode, increase chance of critical and tricky entries
      if (gameMode === "blitz") {
        // Add 50% more weight to critical entries in blitz mode
        eligibleEntries = [
          ...eligibleEntries,
          ...eligibleEntries.filter(entry => entry.critical)
        ];
      }
    }

    // Streak breaker mechanic - with some probability, introduce a really tricky entry
    // Increases with combo length
    const streakBreakerChance = Math.min(0.05 + (combo * 0.005), 0.25);
    if (combo >= 5 && Math.random() < streakBreakerChance && !streakBreakerActive) {
      // Filter for tricky entries
      const trickyEntries = CHANGELOG_ENTRIES.filter(entry => entry.tricky && entry.difficulty >= level);
      if (trickyEntries.length > 0) {
        const randomTrickyIndex = Math.floor(Math.random() * trickyEntries.length);
        setCurrentEntry(trickyEntries[randomTrickyIndex]);
        setStreakBreakerActive(true);

        toast({
          title: "Streak Breaker!",
          description: "This one's extra tricky - watch out!",
          variant: "destructive",
        });

        setTimeLeft(getTimerDuration());
        return;
      }
    } else {
      setStreakBreakerActive(false);
    }

    // Add chance for power-up if no current power-up
    if (Math.random() < 0.15 && !powerUp) {
      const availablePowerUps = ["doublePoints", "extraLife", "slowTime", "skipEntry", "levelBoost"];
      const selectedPowerUp = availablePowerUps[Math.floor(Math.random() * availablePowerUps.length)];
      setPowerUp(selectedPowerUp);
      setPowerUpTimeLeft(10);

      if (powerUpTimerRef.current) {
        clearInterval(powerUpTimerRef.current);
      }

      powerUpTimerRef.current = setInterval(() => {
        setPowerUpTimeLeft(prev => {
          if (prev <= 1) {
            setPowerUp(null);
            if (powerUpTimerRef.current) clearInterval(powerUpTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Critical entry chance increases with level
    const criticalChance = 0.1 * level;
    if (Math.random() < criticalChance && !criticalEntryActive) {
      const criticalEntries = eligibleEntries.filter(entry => entry.critical);
      if (criticalEntries.length > 0) {
        const randomCriticalIndex = Math.floor(Math.random() * criticalEntries.length);
        const criticalEntry = criticalEntries[randomCriticalIndex];
        setCurrentEntry(criticalEntry);
        setCriticalEntryActive(true);

        // Critical entries have their own timer
        setCriticalTimeLeft(5);

        if (criticalTimerRef) {
          clearInterval(criticalTimerRef);
        }

        const timerInterval = setInterval(() => {
          setCriticalTimeLeft(prev => {
            if (prev <= 1) {
              // Time's up for critical entry - penalty
              handleWrongAnswer();
              setCriticalEntryActive(false);
              if (criticalTimerRef) clearInterval(criticalTimerRef);
              pickRandomEntry();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        setCriticalTimerRef(timerInterval);

        toast({
          title: "Critical Entry!",
          description: "Respond quickly for bonus points!",
          variant: "destructive",
        });

        return;
      }
    }

    // Standard random entry selection
    const randomIndex = Math.floor(Math.random() * eligibleEntries.length);
    setCurrentEntry(eligibleEntries[randomIndex]);
    setCriticalEntryActive(false);
    setTimeLeft(getTimerDuration());
  }

  // Skip the current entry - used by skipEntry power-up
  const skipCurrentEntry = () => {
    toast({
      title: "Entry Skipped!",
      description: "That one looked tough!",
    });

    // Don't reset combo when skipping
    pickRandomEntry();
    setPowerUp(null);
    if (powerUpTimerRef.current) clearInterval(powerUpTimerRef.current);
  }

  // Handle answer
  const handleAnswer = (selectedType: string) => {
    if (!currentEntry) return;

    // Base points calculation
    const basePoints = currentEntry.points || 100;
    const difficultyMultiplier = currentEntry.difficulty * 0.5 + 1;
    const timeBonus = Math.round(timeLeft * 10);
    const comboMultiplier = combo > 0 ? (1 + combo * 0.1) : 1;

    // Critical bonus - extra points for fast answers to critical entries
    const criticalBonus = (criticalEntryActive && criticalTimeLeft > 2) ? 1.5 : 1;

    if (selectedType === currentEntry.type) {
      // Correct answer
      let pointsEarned = Math.round(basePoints * difficultyMultiplier + timeBonus);
      pointsEarned = Math.round(pointsEarned * comboMultiplier * criticalBonus);

      // Apply double points power-up
      if (powerUp === "doublePoints") {
        pointsEarned *= 2;
      }

      setScore(prev => prev + pointsEarned);
      setCombo(prev => prev + 1);

      // Update longest streak if combo is greater
      if (combo + 1 > longestStreak) {
        setLongestStreak(combo + 1);
      }

      // In blitz mode, successful answers add time
      if (gameMode === "blitz") {
        setTimeLeft(prev => Math.min(prev + 1, 10)); // Add 1 second, max at 10
      }

      // Level up after every 5 correct answers
      if (combo > 0 && combo % 5 === 0 && level < 3) {
        setLevel(prev => prev + 1);
        toast({
          title: `Level ${level + 1}!`,
          description: "Harder challenges, faster pace, more points!",
        });

        // Special celebration for level up
        triggerParticles(40, selectedType, true);
      } else {
        // Regular correct answer celebration
        triggerParticles(20, selectedType);
      }

      // Extra level boost power-up effect
      if (powerUp === "levelBoost" && level < 3) {
        setLevel(prev => prev + 1);
        toast({
          title: "Level Boost!",
          description: "Jumped to next level - higher points!",
        });
        setPowerUp(null);
        if (powerUpTimerRef.current) clearInterval(powerUpTimerRef.current);
      }

      // Show toast with points breakdown
      let toastDescription = `+${pointsEarned} points`;
      if (comboMultiplier > 1) toastDescription += ` (${combo}x combo!)`;
      if (powerUp === "doublePoints") toastDescription += " (DOUBLE POINTS!)";
      if (criticalBonus > 1) toastDescription += " (CRITICAL BONUS!)";

      toast({
        title: "Correct!",
        description: toastDescription,
      });
    } else {
      // Wrong answer
      handleWrongAnswer();
      setPerfectRound(false);
    }

    // Reset critical timer if active
    if (criticalEntryActive && criticalTimerRef) {
      clearInterval(criticalTimerRef);
      setCriticalEntryActive(false);
    }

    // Reset timer and pick new entry
    pickRandomEntry();
  }

  const handleWrongAnswer = () => {
    setCombo(0); // Reset combo

    // Don't lose a life if extraLife power-up is active
    if (powerUp !== "extraLife") {
      setLives(prev => prev - 1);
    } else {
      toast({
        title: "Extra Life Used!",
        description: "Your power-up saved you!",
      });
      setPowerUp(null);
      if (powerUpTimerRef.current) clearInterval(powerUpTimerRef.current);
    }

    toast({
      title: "Wrong!",
      description: `That was a ${currentEntry?.type || "unknown type"}`,
      variant: "destructive",
    });
  }

  // Effect to check game over
  useEffect(() => {
    if (lives <= 0 && gameStarted) {
      endGame();
    }
  }, [lives, gameStarted]);

  // If user isn't logged in, redirect to login
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-pulse text-lg">Loading...</div>
        </div>
    );
  }

  // Power-up descriptions
  const powerUpDescriptions = {
    "doublePoints": "Double Points: All points are doubled!",
    "extraLife": "Extra Life: Your next mistake won't cost a life!",
    "slowTime": "Slow Time: Time moves at half speed!",
    "skipEntry": "Skip Entry: Skip this challenging entry!",
    "levelBoost": "Level Boost: Jump to the next level for higher points!"
  };

  return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
        {/* No hints shown to user */}

        {/* Particle effect layer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <AnimatePresence>
            {particles.map(particle => (
                <motion.div
                    key={particle.id}
                    className="absolute z-50"
                    style={{
                      left: `${particle.x}%`,
                      top: `${particle.y}%`,
                      width: particle.size,
                      height: particle.size,
                      backgroundColor: particle.color,
                      borderRadius: Math.random() > 0.5 ? '50%' : '0%',
                      rotate: `${particle.rotation}deg`,
                    }}
                    animate={{
                      x: `calc(${particle.vx * 10}vh)`,
                      y: `calc(${particle.vy * 10}vh)`,
                      opacity: 0,
                      scale: Math.random() * 0.5 + 0.5,
                      rotate: `${particle.rotation + (Math.random() > 0.5 ? 180 : -180)}deg`
                    }}
                    initial={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    exit={{ opacity: 0 }}
                />
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {!gameActive ? (
              <motion.div
                  className="text-center max-w-md relative"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
              >
                {/* Center click target (0) */}
                <div
                    className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 cursor-default relative"
                    onClick={() => handleSecretClick(0)} // Center
                >
                  <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />

                  {/* Top click target (1) - Hidden */}
                  <div
                      className="absolute top-0 left-1/2 transform -translate-x-1/2 w-10 h-5 cursor-default"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSecretClick(1); // Top
                      }}
                  />

                  {/* Right click target (2) - Hidden */}
                  <div
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 w-5 h-10 cursor-default"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSecretClick(2); // Right
                      }}
                  />

                  {/* Left click target (3) - Hidden */}
                  <div
                      className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 h-10 cursor-default"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSecretClick(3); // Left
                      }}
                  />

                  {/* Bottom click target (4) - Hidden */}
                  <div
                      className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-10 h-5 cursor-default"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSecretClick(4); // Bottom
                      }}
                  />
                </div>

                <h1 className="mb-4 text-2xl font-bold">
                  Oops! You&apos;re not supposed to be here
                </h1>

                <p className="mb-8 text-muted-foreground">
                  Looks like you&apos;ve stumbled onto a page that doesn&apos;t have much to see.
                  Head back to the dashboard to manage your changelogs.
                </p>

                <Button asChild>
                  <Link href="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
          ) : (
              // Game Interface
              <motion.div
                  className="max-w-2xl w-full"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="text-center mb-4">
                  <h1 className="text-3xl font-bold mb-1">Changelog Hero</h1>
                  <p className="text-muted-foreground">Categorize changelog entries to score points!</p>
                </div>

                {!gameStarted || gameOver ? (
                    // Start/Game Over Screen
                    <motion.div
                        className="bg-muted/40 border rounded-xl p-8 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                      {gameOver ? (
                          <AnimatePresence mode="wait">
                            {showFinalScore ? (
                                <motion.div
                                    key="finalScore"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                  <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
                                  <h2 className="text-2xl font-bold mb-2">Game Over!</h2>
                                  <p className="text-xl mb-4">Your score: <span className="font-bold">{score}</span></p>
                                  <p className="text-muted-foreground mb-2">
                                    {score > highScore ? "New high score! 🎉" : `High score: ${highScore}`}
                                  </p>

                                  {/* Game mode badge */}
                                  <div className="mb-4">
                                    <Badge variant="outline" className="text-primary">
                                      {gameMode === "classic" ? "Classic Mode" :
                                          gameMode === "daily" ? "Daily Challenge" : "Blitz Mode"}
                                    </Badge>
                                  </div>

                                  {/* Stats breakdown */}
                                  <div className="mb-6 bg-background/60 rounded-lg p-4">
                                    <h3 className="font-semibold mb-2">Performance</h3>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div className="text-left text-muted-foreground">Highest Level:</div>
                                      <div className="text-right">{level}</div>
                                      <div className="text-left text-muted-foreground">Highest Combo:</div>
                                      <div className="text-right">{combo}x</div>
                                      <div className="text-left text-muted-foreground">Perfect Round:</div>
                                      <div className="text-right">{perfectRound ? "Yes ✨" : "No"}</div>
                                      <div className="text-left text-muted-foreground">Longest Streak:</div>
                                      <div className="text-right">{longestStreak}x</div>
                                    </div>
                                  </div>

                                  {/* Achievements */}
                                  {unlockedAchievements.length > 0 && (
                                      <div className="mb-6">
                                        <h3 className="font-semibold mb-2">Achievements Unlocked</h3>
                                        <div className="flex flex-wrap justify-center gap-2">
                                          {unlockedAchievements.map(achievement => (
                                              <div key={achievement} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                                {achievement}
                                              </div>
                                          ))}
                                        </div>
                                      </div>
                                  )}
                                </motion.div>
                            ) : null}
                          </AnimatePresence>
                      ) : (
                          showGameModeSelect ? (
                              <motion.div
                                  key="gameModeSelect"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                              >
                                <h2 className="text-2xl font-bold mb-4">Select Game Mode</h2>

                                <div className="grid gap-4 mb-6">
                                  <motion.div
                                      className="bg-card border rounded-lg p-4 text-left cursor-pointer hover:border-primary transition-colors"
                                      whileHover={{ scale: 1.02 }}
                                      onClick={() => startGame("classic")}
                                  >
                                    <div className="flex items-center">
                                      <div className="p-2 bg-primary/20 rounded-full mr-3">
                                        <Trophy className="h-5 w-5 text-primary" />
                                      </div>
                                      <div>
                                        <h3 className="font-semibold">Classic Mode</h3>
                                        <p className="text-sm text-muted-foreground">Standard game with 3 lives and increasing difficulty</p>
                                      </div>
                                    </div>
                                  </motion.div>

                                  <motion.div
                                      className={`bg-card border rounded-lg p-4 text-left transition-colors ${
                                          dailyChallengeAvailable
                                              ? "cursor-pointer hover:border-primary"
                                              : "opacity-70 cursor-not-allowed"
                                      }`}
                                      whileHover={dailyChallengeAvailable ? { scale: 1.02 } : {}}
                                      onClick={() => dailyChallengeAvailable && startGame("daily")}
                                  >
                                    <div className="flex items-center">
                                      <div className="p-2 bg-blue-500/20 rounded-full mr-3">
                                        <Calendar className="h-5 w-5 text-blue-500" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h3 className="font-semibold">Daily Challenge</h3>
                                          {dailyChallengeCompleted && (
                                              <Badge variant="outline" className="text-xs">Completed</Badge>
                                          )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          {dailyChallengeAvailable
                                              ? "Special daily entries with higher rewards"
                                              : "Come back tomorrow for a new challenge!"}
                                        </p>
                                      </div>
                                    </div>
                                  </motion.div>

                                  <motion.div
                                      className="bg-card border rounded-lg p-4 text-left cursor-pointer hover:border-primary transition-colors"
                                      whileHover={{ scale: 1.02 }}
                                      onClick={() => startGame("blitz")}
                                  >
                                    <div className="flex items-center">
                                      <div className="p-2 bg-red-500/20 rounded-full mr-3">
                                        <Flame className="h-5 w-5 text-red-500" />
                                      </div>
                                      <div>
                                        <h3 className="font-semibold">Blitz Mode</h3>
                                        <p className="text-sm text-muted-foreground">Fast-paced: 1 life, gain time with correct answers</p>
                                      </div>
                                    </div>
                                  </motion.div>
                                </div>

                                <Button variant="outline" size="sm" onClick={() => setShowGameModeSelect(false)}>
                                  Back
                                </Button>
                              </motion.div>
                          ) : (
                              <motion.div
                                  key="welcomeScreen"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                              >
                                <div className="flex justify-center space-x-2 mb-6">
                                  {CHANGE_TYPES.map(type => (
                                      <motion.div
                                          key={type.type}
                                          className={`${type.color} bg-muted/80 rounded-full p-3`}
                                          whileHover={{ scale: 1.1 }}
                                      >
                                        <type.icon className="h-6 w-6" />
                                      </motion.div>
                                  ))}
                                </div>
                                <h2 className="text-2xl font-bold mb-4">Ready to play?</h2>
                                <p className="text-muted-foreground mb-4">
                                  Categorize changelog entries by their type before time runs out!
                                </p>
                                <div className="mb-8 space-y-2 text-sm">
                                  <p>• Level up after 5 consecutive correct answers</p>
                                  <p>• Higher levels have harder entries & faster pace</p>
                                  <p>• Combo multiplier increases your score</p>
                                  <p>• Watch for special power-ups to help you</p>
                                  <p>• Respond quickly to critical entries for bonus points</p>
                                </div>

                                <div className="flex justify-center space-x-4">
                                  <Button onClick={() => setShowGameModeSelect(true)}>
                                    Choose Mode
                                  </Button>
                                  <Button variant="outline" asChild>
                                    <Link href="/dashboard">Go to Dashboard</Link>
                                  </Button>
                                </div>
                              </motion.div>
                          )
                      )}
                    </motion.div>
                ) : (
                    // Active Game Screen
                    <div className="space-y-6">
                      {/* Game HUD */}
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between bg-muted/40 border rounded-lg px-4 py-3">
                          <div className="flex items-center space-x-4">
                            <div>
                              <div className="text-xs uppercase text-muted-foreground">Score</div>
                              <div className="font-bold">{score}</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase text-muted-foreground">Level</div>
                              <div className="font-bold">{level}</div>
                            </div>
                            {combo > 1 && (
                                <div>
                                  <div className="text-xs uppercase text-muted-foreground">Combo</div>
                                  <div className="text-primary font-bold">{combo}x</div>
                                </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-3">
                            <div>
                              <div className="text-xs uppercase text-muted-foreground">Lives</div>
                              <div className="flex space-x-1">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-3 h-3 rounded-full ${
                                            i < lives ? 'bg-red-500' : 'bg-muted'
                                        }`}
                                    />
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs uppercase text-muted-foreground">Time</div>
                              <div className="font-mono">{timeLeft}s</div>
                            </div>
                          </div>
                        </div>

                        {/* Game mode badge */}
                        <div className="flex justify-between items-center">
                          <Badge variant="outline" className="text-xs">
                            {gameMode === "classic" ? "Classic Mode" :
                                gameMode === "daily" ? "Daily Challenge" : "Blitz Mode"}
                          </Badge>

                          {/* Power-up display */}
                          {powerUp && (
                              <motion.div
                                  className="bg-primary/20 text-primary text-sm rounded-lg px-3 py-1.5 flex items-center"
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                              >
                                <Flame className="h-4 w-4 mr-2 animate-pulse" />
                                <span>{powerUpDescriptions[powerUp as keyof typeof powerUpDescriptions]}</span>
                                <span className="ml-2 text-xs">{powerUpTimeLeft}s</span>
                              </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Current Entry */}
                      {currentEntry && (
                          <motion.div
                              className={`bg-card border rounded-lg p-6 text-center relative overflow-hidden ${
                                  criticalEntryActive ? 'border-red-500' :
                                      streakBreakerActive ? 'border-yellow-500' : ''
                              }`}
                              key={currentEntry.text + Math.random()} // Ensure animation on change
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                          >
                            {criticalEntryActive ? (
                                // Critical entry timer
                                <Progress
                                    value={(criticalTimeLeft / 5) * 100}
                                    className="h-1 absolute top-0 left-0 right-0 rounded-none bg-muted [&>div]:bg-red-500"
                                />
                            ) : (
                                // Regular timer
                                <Progress
                                    value={(timeLeft / getTimerDuration()) * 100}
                                    className="h-1 absolute top-0 left-0 right-0 rounded-none bg-muted"
                                />
                            )}

                            {/* Show difficulty level indicator */}
                            <div className="absolute top-2 right-2 flex">
                              {Array.from({ length: currentEntry.difficulty }).map((_, i) => (
                                  <Star key={i} className="h-3 w-3 text-yellow-500" />
                              ))}
                            </div>

                            {/* Critical entry indicator */}
                            {criticalEntryActive && (
                                <motion.div
                                    className="absolute top-2 left-2 text-xs text-red-500 font-bold flex items-center"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                  <Flame className="h-3 w-3 mr-1" /> CRITICAL!
                                </motion.div>
                            )}

                            {/* Streak breaker indicator */}
                            {streakBreakerActive && (
                                <motion.div
                                    className="absolute top-2 left-2 text-xs text-yellow-500 font-bold flex items-center"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                  <AlertCircle className="h-3 w-3 mr-1" /> TRICKY!
                                </motion.div>
                            )}

                            {/* Show level upgrade indicator */}
                            {combo > 0 && combo % 5 === 0 && combo % 5 < 2 && (
                                <motion.div
                                    className="absolute top-2 left-2 text-xs text-primary font-bold flex items-center"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                  <ChevronUp className="h-3 w-3 mr-1" /> LEVEL UP!
                                </motion.div>
                            )}

                            <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                            <p className="text-xl font-medium">&ldquo;{currentEntry.text}&rdquo;</p>

                            {/* Skip button for skipEntry power-up */}
                            {powerUp === "skipEntry" && (
                                <motion.button
                                    className="mt-4 text-sm flex items-center mx-auto bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-md"
                                    onClick={skipCurrentEntry}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                  <TimerReset className="h-3 w-3 mr-1" /> Skip This Entry
                                </motion.button>
                            )}
                          </motion.div>
                      )}

                      {/* Answer Buttons */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {CHANGE_TYPES.map(type => (
                            <TooltipProvider key={type.type}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <motion.button
                                      className={`flex flex-col items-center justify-center space-y-2 p-4 rounded-lg border-2 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
                                      onClick={() => handleAnswer(type.type)}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                  >
                                    <type.icon className={`h-5 w-5 ${type.color}`} />
                                    <span className="text-sm">{type.label}</span>
                                  </motion.button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  <p className="text-xs">{getTypeDescription(type.type)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                        ))}
                      </div>
                    </div>
                )}

                <div className="mt-8 text-center text-xs text-muted-foreground opacity-50">
                  Changelog Hero v1.1
                </div>
              </motion.div>
          )}
        </AnimatePresence>
      </div>
  )
}

// Helper function to get descriptions for each changelog type
function getTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'feature': 'New functionality added to the application',
    'bugfix': 'Fix for something that wasn\'t working correctly',
    'improvement': 'Enhancement to existing functionality',
    'breaking': 'Change that requires users to update their code or usage',
    'security': 'Fixes or enhancements related to security',
    'performance': 'Changes that improve speed or resource usage',
    'hotfix': 'Urgent fixes deployed outside regular release cycle',
    'deprecation': 'Features marked for removal in future releases'
  };

  return descriptions[type] || '';
}