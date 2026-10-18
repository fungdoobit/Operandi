// What each teammate says at the big moments. DOT is calm, patient and kind.
// PYRO (PYthon Runtime Operative) is energetic, fired-up and a bit competitive.
// Error explanations and hints are shared (content/help.js); only the
// personality lines differ. Each entry returns { title?, text }.

export const VOICES = {
  dot: {
    name: "DOT",
    welcome: (it) => ({ title: "Welcome to Operandi", text: `Hi, I'm DOT, your Digital Operandi Teammate! I'll check your code, explain errors and cheer you on. You start with ${it.hint} hints, ${it.peek} peeks and ${it.solution} solutions. Read the lesson, then write your code on the right.` }),
    lessonIntro: (n, title) => ({ text: `Lesson ${n}: ${title}. Read through, try the examples with Run example, then have a go at the task.` }),
    outputMatches: () => ({ title: "Looking good", text: "Your output matches the expected output. Press Submit to get it marked." }),
    passed: (mark) => ({ title: `Passed! ${mark}/10`, text: mark === 10 ? "Clean code, nothing to fix." : "It works." }),
    notYet: () => ({ title: "Not quite yet" }),
    idle: () => ({ title: "Taking a break?", text: "Still with me? If you're stuck, read the task again line by line, or press Run to see where you are." }),
    practice: (allDone) => ({ text: allDone ? "Pick a difficulty. If Easy feels easy, try Medium: that's where the real learning is." : "Practice what you've learned so far. More challenge types open up as you finish lessons." }),
    challenge: (diff, title) => ({ text: `${diff} challenge: ${title}. Read the steps, then code it on the right.` }),
    bought: (name) => ({ text: `Ooh, ${name.toLowerCase()}! Press Use to put it on.` }),
    roamFree: () => ({ text: "Off I go! Pick me up and drop me anywhere if I'm in the way." }),
    parked: () => ({ text: "I'll stay right here. Double-click me if you want me to wander again." }),
    switchIn: () => ({ title: "DOT's back", text: "Hello again! Calm and steady, let's keep going." }),
    keepTrying: () => ({ text: "Good call. Read my last tip again, and try one small change at a time." }),
  },
  pyro: {
    name: "PYRO",
    welcome: (it) => ({ title: "PYRO, reporting for duty!", text: `I'm PYRO, your PYthon Runtime Operative! Let's set this code on fire (the good kind). You've got ${it.hint} hints, ${it.peek} peeks and ${it.solution} solutions. Read the lesson, then let's go!` }),
    lessonIntro: (n, title) => ({ text: `Lesson ${n}: ${title}! Blast through the examples with Run example, then crush the task.` }),
    outputMatches: () => ({ title: "Red-hot!", text: "Output matches perfectly. Hit Submit and claim those Bits!" }),
    passed: (mark) => ({ title: mark === 10 ? `PERFECT! ${mark}/10` : `Passed! ${mark}/10`, text: mark === 10 ? "Flawless! That bug didn't stand a chance." : "It works! Now let's make it even hotter." }),
    notYet: () => ({ title: "Not yet, but we're heating up!" }),
    idle: () => ({ title: "Embers getting low...", text: "Hey! Still there? Reread the task, hit Run, and let's get the fire going again." }),
    practice: (allDone) => ({ text: allDone ? "Challenge time! Easy is a warm-up. Medium is where the fire is. Hard is a volcano." : "Let's train! More challenge types unlock as you clear lessons." }),
    challenge: (diff, title) => ({ text: `${diff} challenge: ${title}! Read the steps and let's torch it.` }),
    bought: (name) => ({ text: `${name}? Oh, that's FIRE! Press Use to put it on.` }),
    roamFree: () => ({ text: "Freedom! Grab me and drop me wherever if I'm blocking anything." }),
    parked: () => ({ text: "Holding this spot! Double-click me to set me loose again." }),
    switchIn: () => ({ title: "PYRO's here!", text: "Fired up and ready! Let's crush some Python!" }),
    keepTrying: () => ({ text: "That's the spirit! One small change at a time, then hit Submit." }),
  },
};
