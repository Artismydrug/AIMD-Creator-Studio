import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Flame, Trophy, Sparkles, ImageIcon, Compass, GraduationCap, Crown, Pause, Play, RotateCcw } from 'lucide-react';

const SCENE_DURATIONS = [4000, 4500, 4500, 4000, 5000, 4000];
const TOTAL_SCENES = SCENE_DURATIONS.length;

export function CreatorAppExplainer() {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackCycle, setPlaybackCycle] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isPlaying || shouldReduceMotion) return;
    
    let timeout = setTimeout(() => {
      setCurrentScene((prev) => (prev + 1) % TOTAL_SCENES);
    }, SCENE_DURATIONS[currentScene]);

    return () => clearTimeout(timeout);
  }, [currentScene, isPlaying, playbackCycle, shouldReduceMotion]);

  const replayExplainer = () => {
    setCurrentScene(0);
    setIsPlaying(true);
    setPlaybackCycle((cycle) => cycle + 1);
  };

  if (shouldReduceMotion) {
    return (
      <div className="w-full rounded-xl bg-black border border-border/50 text-white p-6 md:p-10">
        <div className="flex items-center gap-3 mb-6 text-primary">
          <Flame className="w-6 h-6" />
          <h2 className="text-2xl font-black font-display uppercase tracking-tight">The Creator App</h2>
        </div>
        <p className="text-white/80 mb-8 font-mono text-sm uppercase tracking-wider">A Digital Studio Where Practice Becomes Progress</p>
        
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
            <h3 className="font-bold text-lg mb-2 text-[#ff5252]">Show Up. Every Day.</h3>
            <p className="text-sm text-white/70">Daily check-in streaks build discipline. Collectible badges make the grind visible. Your effort, recognized.</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
            <h3 className="font-bold text-lg mb-2 text-[#ff00ff]">Compete. Win Rewards.</h3>
            <p className="text-sm text-white/70">Weekly Challenges push your craft. Spin the Reward Wheel daily to turn consistency into perks.</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
            <h3 className="font-bold text-lg mb-2 text-[#00ffff]">Publish & Be Seen.</h3>
            <p className="text-sm text-white/70">Curate your public portfolio. Get featured in the AIMD gallery. Let your best work speak for itself.</p>
          </div>
        </div>

        <h3 className="font-black font-display text-xl uppercase mb-4">Three Phases. One Journey.</h3>
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="border border-[#00ffff]/30 bg-white/5 p-4 rounded-xl">
            <span className="text-xs text-[#00ffff] font-mono">Phase 01</span>
            <p className="font-bold uppercase">Discovering</p>
          </div>
          <div className="border border-[#ff00ff]/30 bg-white/5 p-4 rounded-xl">
            <span className="text-xs text-[#ff00ff] font-mono">Phase 02</span>
            <p className="font-bold uppercase">Dedicated</p>
          </div>
          <div className="border border-[#ffd700]/30 bg-white/5 p-4 rounded-xl">
            <span className="text-xs text-[#ffd700] font-mono">Phase 03</span>
            <p className="font-bold uppercase">Professional</p>
          </div>
        </div>

        <p className="text-center font-display font-black text-2xl uppercase tracking-tight text-gradient-brand">
          Interest → Discipline → Opportunity.
        </p>
      </div>
    );
  }

  return (
    <div 
      className="w-full aspect-video rounded-xl overflow-hidden relative bg-black border border-border/50 text-white select-none @container group"
    >
      {/* Screen Reader Script */}
      <div className="sr-only">
        <h2>Creator App Explainer Video</h2>
        <p>The Creator App. A Digital Studio Where Practice Becomes Progress.</p>
        <p>Feature 1: Show Up. Every Day. Daily check-in streaks build discipline. Collectible badges make the grind visible. Your effort, recognized.</p>
        <p>Feature 2: Compete. Win Rewards. Weekly Challenges: Themed sprints that push your craft. Climb the leaderboards. Reward Wheel: Spin daily. Turn consistency into perks and surprises.</p>
        <p>Feature 3: Publish & Be Seen. Curate your public portfolio. Get featured in the AIMD gallery. Let your best work speak for itself.</p>
        <p>Three Phases. One Journey. Phase 1: Discovering. Phase 2: Dedicated. Phase 3: Professional.</p>
        <p>The Path is Clear. Interest leads to Discipline, which leads to Opportunity. Start Creating.</p>
      </div>

      {/* Visual content hidden from SR since text is provided above */}
      <div aria-hidden="true" className="absolute inset-0">
        {/* Background layer - Persistent across scenes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Animated Gradient blob */}
          <motion.div
            className="absolute w-[80cqw] h-[80cqw] rounded-full blur-[8cqw] opacity-20 mix-blend-screen"
            animate={{
              x: currentScene % 2 === 0 ? '10%' : '-50%',
              y: currentScene % 3 === 0 ? '-20%' : '20%',
              backgroundColor: 
                currentScene === 1 ? '#ff5252' : // coral
                currentScene === 2 ? '#ff00ff' : // magenta
                currentScene === 3 ? '#00ffff' : // cyan
                currentScene === 4 ? '#ffd700' : // gold
                '#ff00ff',
              scale: currentScene === 4 ? 1.5 : 1
            }}
            transition={{ duration: 3, ease: 'easeInOut' }}
          />
          {/* Local embedded noise SVG to replace external Vercel app request */}
          <div 
            className="absolute inset-0 opacity-[0.15] mix-blend-overlay"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          ></div>
        </div>

        <AnimatePresence mode="popLayout">
          {currentScene === 0 && <Scene0 key={`scene0-${playbackCycle}`} />}
          {currentScene === 1 && <Scene1 key={`scene1-${playbackCycle}`} />}
          {currentScene === 2 && <Scene2 key={`scene2-${playbackCycle}`} />}
          {currentScene === 3 && <Scene3 key={`scene3-${playbackCycle}`} />}
          {currentScene === 4 && <Scene4 key={`scene4-${playbackCycle}`} />}
          {currentScene === 5 && <Scene5 key={`scene5-${playbackCycle}`} />}
        </AnimatePresence>
      </div>

      {/* Persistent Controls & Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 flex items-center gap-4 z-50 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
        {/* Progress Bars */}
        <div className="flex-1 flex gap-1 md:gap-1.5" aria-hidden="true">
          {SCENE_DURATIONS.map((duration, i) => (
            <div key={`${i}-${playbackCycle}`} className="h-1 md:h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-white rounded-full origin-left"
                initial={{ scaleX: i < currentScene ? 1 : 0 }}
                animate={{ 
                  scaleX: i === currentScene ? 1 : i < currentScene ? 1 : 0 
                }}
                transition={{ 
                  duration: i === currentScene ? duration / 1000 : 0, 
                  ease: 'linear' 
                }}
              />
            </div>
          ))}
        </div>

        <div className="pointer-events-auto shrink-0 flex items-center gap-2">
          <button
            onClick={() => setIsPlaying((playing) => !playing)}
            aria-label={isPlaying ? "Pause explainer video" : "Play explainer video"}
            className="h-[44px] min-w-[44px] px-2.5 flex items-center justify-center gap-1.5 bg-black/80 hover:bg-black text-white rounded-full border border-white/30 backdrop-blur-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black shadow-lg font-mono text-[10px] uppercase tracking-wide"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            onClick={replayExplainer}
            aria-label="Replay explainer video from the beginning"
            className="h-[44px] min-w-[44px] px-2.5 flex items-center justify-center gap-1.5 bg-black/80 hover:bg-black text-white rounded-full border border-white/30 backdrop-blur-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black shadow-lg font-mono text-[10px] uppercase tracking-wide"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Replay</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// SCENES (Mobile Optimized with clamp typography)
// ---------------------------------------------------------

function Scene0() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-8 text-center"
      initial="initial" animate="animate" exit="exit"
      variants={{
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { staggerChildren: 0.2 } },
        exit: { opacity: 0, scale: 1.1, filter: 'blur(8px)', transition: { duration: 0.5 } }
      }}
    >
      <motion.div 
        variants={{
          initial: { opacity: 0, y: '2cqw', rotateX: -20 },
          animate: { opacity: 1, y: 0, rotateX: 0 }
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="w-10 h-10 md:w-16 md:h-16 rounded-lg md:rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-2 md:mb-6 backdrop-blur-md"
      >
        <Flame className="w-5 h-5 md:w-8 md:h-8 text-white" />
      </motion.div>
      
      <motion.div className="overflow-hidden mb-2 md:mb-4">
        <motion.h2 
          variants={{ initial: { y: '100%' }, animate: { y: 0 } }}
          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          className="text-[clamp(1.5rem,5cqw,4rem)] font-black font-display uppercase tracking-tight leading-[0.9]"
        >
          The Creator App
        </motion.h2>
      </motion.div>
      
      <motion.p 
        variants={{ initial: { opacity: 0, y: '1cqw' }, animate: { opacity: 1, y: 0 } }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="text-[clamp(0.7rem,1.5cqw,1.5rem)] text-white/70 max-w-[80%] md:max-w-xl font-mono uppercase tracking-widest leading-snug"
      >
        A Digital Studio Where <br className="hidden sm:block"/><span className="text-white font-bold">Practice Becomes Progress</span>
      </motion.p>
    </motion.div>
  );
}

function Scene1() {
  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center p-4 md:p-12"
      initial="initial" animate="animate" exit="exit"
      variants={{
        initial: { opacity: 0, x: '5cqw' },
        animate: { opacity: 1, x: 0, transition: { staggerChildren: 0.15 } },
        exit: { opacity: 0, x: '-5cqw', filter: 'blur(10px)', transition: { duration: 0.5 } }
      }}
    >
      <div className="w-full flex flex-row items-center gap-4 md:gap-10">
        <div className="flex-1 text-left w-full">
          <motion.div 
            variants={{ initial: { scale: 0 }, animate: { scale: 1 } }}
            className="inline-flex items-center gap-1 md:gap-2 px-2 py-0.5 md:px-3 md:py-1 bg-[#ff5252]/20 border border-[#ff5252]/50 text-[#ff5252] font-mono text-[clamp(0.5rem,1cqw,0.8rem)] uppercase tracking-widest mb-2 md:mb-6 rounded-full"
          >
            <Flame className="w-3 h-3 md:w-4 md:h-4" /> Feature 01
          </motion.div>
          <motion.h2 
            variants={{ initial: { opacity: 0, y: '2cqw' }, animate: { opacity: 1, y: 0 } }}
            className="text-[clamp(1.5rem,4.5cqw,4rem)] font-black font-display uppercase tracking-tight leading-[0.9] mb-1 md:mb-4"
          >
            Show Up. <br/>
            <span className="text-[#ff5252]">Every Day.</span>
          </motion.h2>
          <motion.p 
            variants={{ initial: { opacity: 0, y: '2cqw' }, animate: { opacity: 1, y: 0 } }}
            className="text-[clamp(0.6rem,1.5cqw,1.25rem)] text-white/70 font-sans leading-snug md:leading-relaxed max-w-[90%]"
          >
            Daily check-in streaks build discipline. Collectible badges make the grind visible. Your effort, recognized.
          </motion.p>
        </div>
        
        <div className="hidden sm:flex flex-1 w-full relative h-full items-center justify-center perspective-[1000px]">
          {/* Badge Mockups */}
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              variants={{
                initial: { opacity: 0, z: -500, rotateY: 45, x: `${(i - 2) * 5}cqw` },
                animate: { opacity: 1, z: 0, rotateY: 0, x: `${(i - 2) * 8}cqw` }
              }}
              transition={{ delay: 0.3 + (i * 0.15), type: 'spring', damping: 15 }}
              className={`absolute w-16 h-16 md:w-32 md:h-32 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-xl flex items-center justify-center ${i === 2 ? 'z-10 bg-white/20 border-[#ff5252]/50 scale-110 shadow-[0_0_30px_rgba(255,82,82,0.3)]' : 'opacity-50'}`}
            >
              <div className="w-8 h-8 md:w-16 md:h-16 rounded-full bg-[#ff5252]/20 flex items-center justify-center">
                <Flame className={`w-4 h-4 md:w-8 md:h-8 ${i === 2 ? 'text-[#ff5252]' : 'text-white/50'}`} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Scene2() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-12 text-center"
      initial="initial" animate="animate" exit="exit"
      variants={{
        initial: { opacity: 0, scale: 1.1 },
        animate: { opacity: 1, scale: 1, transition: { staggerChildren: 0.2 } },
        exit: { opacity: 0, scale: 0.9, transition: { duration: 0.5 } }
      }}
    >
      <motion.div 
        variants={{ initial: { opacity: 0, y: '-2cqw' }, animate: { opacity: 1, y: 0 } }}
        className="inline-flex items-center gap-1 md:gap-2 px-2 py-0.5 md:px-3 md:py-1 bg-[#ff00ff]/20 border border-[#ff00ff]/50 text-[#ff00ff] font-mono text-[clamp(0.5rem,1cqw,0.8rem)] uppercase tracking-widest mb-1 md:mb-4 rounded-full"
      >
        <Trophy className="w-3 h-3 md:w-4 md:h-4" /> Feature 02
      </motion.div>
      
      <motion.h2 
        variants={{ initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 } }}
        className="text-[clamp(1.5rem,4cqw,4rem)] font-black font-display uppercase tracking-tight leading-[0.9] mb-2 md:mb-6 max-w-2xl"
      >
        Compete.<br className="sm:hidden"/>
        <span className="text-[#ff00ff]">Win Rewards.</span>
      </motion.h2>
      
      <div className="flex flex-row gap-2 md:gap-6 mt-1 md:mt-2 w-full max-w-3xl">
        <motion.div 
          variants={{ initial: { opacity: 0, x: '-3cqw' }, animate: { opacity: 1, x: 0 } }}
          className="flex-1 p-2 md:p-6 rounded-lg md:rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-left"
        >
          <Trophy className="w-4 h-4 md:w-8 md:h-8 text-[#ff00ff] mb-1 md:mb-3" />
          <h3 className="font-display font-bold text-[clamp(0.7rem,1.5cqw,1.5rem)] uppercase mb-0.5 md:mb-2 leading-tight">Weekly Challenges</h3>
          <p className="text-white/60 text-[clamp(0.55rem,1.2cqw,1rem)] leading-snug md:leading-relaxed">Themed sprints that push your craft. Climb the leaderboards.</p>
        </motion.div>
        
        <motion.div 
          variants={{ initial: { opacity: 0, x: '3cqw' }, animate: { opacity: 1, x: 0 } }}
          className="flex-1 p-2 md:p-6 rounded-lg md:rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-left relative overflow-hidden"
        >
          <Sparkles className="w-4 h-4 md:w-8 md:h-8 text-[#ffd700] mb-1 md:mb-3" />
          <h3 className="font-display font-bold text-[clamp(0.7rem,1.5cqw,1.5rem)] uppercase mb-0.5 md:mb-2 leading-tight">Reward Wheel</h3>
          <p className="text-white/60 text-[clamp(0.55rem,1.2cqw,1rem)] leading-snug md:leading-relaxed">Spin daily. Turn consistency into perks and surprises.</p>
          
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="hidden sm:block absolute -right-8 -bottom-8 w-24 h-24 rounded-full border-[3px] border-dashed border-white/10 opacity-30"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

function Scene3() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-row items-center justify-center p-4 md:p-12 gap-4 md:gap-10"
      initial="initial" animate="animate" exit="exit"
      variants={{
        initial: { opacity: 0, rotateY: -90 },
        animate: { opacity: 1, rotateY: 0, transition: { staggerChildren: 0.15, type: 'spring', damping: 20 } },
        exit: { opacity: 0, x: '10cqw', transition: { duration: 0.5 } }
      }}
    >
      <div className="hidden sm:grid flex-1 grid-cols-2 gap-2 md:gap-4 perspective-[1000px]">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            variants={{
              initial: { opacity: 0, scale: 0.5, y: '5cqw' },
              animate: { opacity: 1, scale: 1, y: 0 }
            }}
            transition={{ delay: 0.2 + (i * 0.1) }}
            className={`rounded-lg md:rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 overflow-hidden aspect-square col-span-1 ${i === 2 ? '-mt-2 mb-2 md:-mt-4 md:mb-4' : ''}`}
          >
            <div className="w-full h-full bg-[#00ffff]/10 flex items-center justify-center p-2">
              <ImageIcon className="w-6 h-6 md:w-10 md:h-10 text-[#00ffff]/50" />
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="flex-[2] sm:flex-1 text-left w-full">
        <motion.div 
          variants={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
          className="inline-flex items-center gap-1 md:gap-2 px-2 py-0.5 md:px-3 md:py-1 bg-[#00ffff]/20 border border-[#00ffff]/50 text-[#00ffff] font-mono text-[clamp(0.5rem,1cqw,0.8rem)] uppercase tracking-widest mb-2 md:mb-6 rounded-full"
        >
          <ImageIcon className="w-3 h-3 md:w-4 md:h-4" /> Feature 03
        </motion.div>
        
        <motion.h2 
          variants={{ initial: { opacity: 0, x: '2cqw' }, animate: { opacity: 1, x: 0 } }}
          className="text-[clamp(1.5rem,4.5cqw,4rem)] font-black font-display uppercase tracking-tight leading-[0.9] mb-1 md:mb-4"
        >
          Publish & <br/>
          <span className="text-[#00ffff]">Be Seen.</span>
        </motion.h2>
        
        <motion.p 
          variants={{ initial: { opacity: 0, x: '2cqw' }, animate: { opacity: 1, x: 0 } }}
          className="text-[clamp(0.6rem,1.5cqw,1.25rem)] text-white/70 leading-snug md:leading-relaxed max-w-[90%]"
        >
          Curate your public portfolio. Get featured in the AIMD gallery. Let your best work speak for itself.
        </motion.p>
      </div>
    </motion.div>
  );
}

function Scene4() {
  const phases = [
    { icon: Compass, title: 'Phase 01', subtitle: 'Discovering', color: '#00ffff' },
    { icon: GraduationCap, title: 'Phase 02', subtitle: 'Dedicated', color: '#ff00ff' },
    { icon: Crown, title: 'Phase 03', subtitle: 'Professional', color: '#ffd700' },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-12 text-center"
      initial="initial" animate="animate" exit="exit"
      variants={{
        initial: { opacity: 0, y: '10cqw' },
        animate: { opacity: 1, y: 0, transition: { staggerChildren: 0.3 } },
        exit: { opacity: 0, filter: 'blur(20px)', transition: { duration: 0.6 } }
      }}
    >
      <motion.h2 
        variants={{ initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 } }}
        className="text-[clamp(1.2rem,3.5cqw,3rem)] font-black font-display uppercase tracking-tight mb-2 md:mb-8"
      >
        Three Phases. <span className="text-white/50">One Journey.</span>
      </motion.h2>
      
      <div className="flex flex-row gap-2 md:gap-6 w-full max-w-4xl justify-center items-stretch h-full max-h-[140px] md:max-h-[220px]">
        {phases.map((phase, i) => (
          <motion.div
            key={i}
            variants={{
              initial: { opacity: 0, y: '5cqw' },
              animate: { opacity: 1, y: 0 }
            }}
            transition={{ type: 'spring', damping: 20 }}
            className="flex-1 w-full relative"
          >
            {i > 0 && (
              <div className="absolute top-1/2 -left-1 md:-left-3 w-2 md:w-6 h-[1px] md:h-[2px] bg-white/20 -translate-y-1/2" />
            )}
            <div 
              className="p-2 md:p-6 rounded-lg md:rounded-2xl bg-white/5 border backdrop-blur-md flex flex-col items-center justify-center h-full"
              style={{ borderColor: `${phase.color}40` }}
            >
              <div 
                className="hidden sm:flex w-8 h-8 md:w-12 md:h-12 rounded-full items-center justify-center mb-2 md:mb-4"
                style={{ backgroundColor: `${phase.color}20`, color: phase.color }}
              >
                <phase.icon className="w-4 h-4 md:w-6 md:h-6" />
              </div>
              <p className="font-mono text-[clamp(0.45rem,1cqw,0.8rem)] uppercase tracking-widest text-white/50 mb-0.5 md:mb-2">{phase.title}</p>
              <h3 className="font-display font-bold text-[clamp(0.6rem,1.5cqw,1.5rem)] uppercase leading-tight" style={{ color: phase.color }}>{phase.subtitle}</h3>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Scene5() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-12 text-center bg-black/50 backdrop-blur-sm"
      initial="initial" animate="animate" exit="exit"
      variants={{
        initial: { opacity: 0, scale: 1.2 },
        animate: { opacity: 1, scale: 1, transition: { staggerChildren: 0.4 } },
        exit: { opacity: 0, transition: { duration: 0.5 } }
      }}
    >
      <motion.div 
        variants={{
          initial: { opacity: 0, y: '2cqw' },
          animate: { opacity: 1, y: 0 }
        }}
        className="font-mono text-[clamp(0.6rem,1cqw,1rem)] uppercase tracking-[0.3em] text-white/50 mb-2 md:mb-6"
      >
        The Path is Clear
      </motion.div>
      
      <div className="overflow-hidden">
        <motion.h2 
          variants={{ initial: { y: '100%' }, animate: { y: 0 } }}
          transition={{ type: 'spring', damping: 20 }}
          className="text-[clamp(1.5rem,5cqw,4.5rem)] font-black font-display uppercase tracking-tight leading-[1] mb-0.5 md:mb-2"
        >
          Interest <span className="text-white/30 text-[clamp(1rem,3cqw,3rem)] align-middle mx-1 md:mx-4">→</span>
        </motion.h2>
      </div>
      <div className="overflow-hidden">
        <motion.h2 
          variants={{ initial: { y: '100%' }, animate: { y: 0 } }}
          transition={{ type: 'spring', damping: 20 }}
          className="text-[clamp(1.5rem,5cqw,4.5rem)] font-black font-display uppercase tracking-tight leading-[1] mb-0.5 md:mb-2"
        >
          Discipline <span className="text-white/30 text-[clamp(1rem,3cqw,3rem)] align-middle mx-1 md:mx-4">→</span>
        </motion.h2>
      </div>
      <div className="overflow-hidden mb-3 md:mb-8">
        <motion.h2 
          variants={{ initial: { y: '100%' }, animate: { y: 0 } }}
          transition={{ type: 'spring', damping: 20 }}
          className="text-[clamp(1.5rem,5cqw,4.5rem)] font-black font-display uppercase tracking-tight leading-[1] text-gradient-brand"
        >
          Opportunity.
        </motion.h2>
      </div>

      <motion.div 
        variants={{ initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 } }}
        className="px-3 py-1.5 md:px-6 md:py-3 bg-white text-black font-display font-bold uppercase rounded-full tracking-wider text-[clamp(0.6rem,1.2cqw,1.2rem)]"
      >
        Start Creating
      </motion.div>
    </motion.div>
  );
}
