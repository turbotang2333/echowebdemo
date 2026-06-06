// Static star definitions — personality stars on a sphere, memory stars orbiting them.

// Black hole nebula: dark center with purple glow flowing inward
export const NEBULA = {
  id: 'nebula-hint',
  theta: 2.3,
  phi: 1.0,
  radius: 100,
  color: 0xb388ff,
  baseScale: 45,
  ringCount: 5,
  answerIds: ['mem-02', 'mem-05', 'mem-07'],
};

export const PERSONALITY_STARS = [
  { id: 'fear',       label: '惧',  theta: 0.4,  phi: 1.1,  radius: 100, color: 0x7c4dff, lit: true  },
  { id: 'tenderness', label: '柔',  theta: 1.7,  phi: 0.85, radius: 100, color: 0x81d4fa, lit: true  },
  { id: 'defiance',   label: '逆',  theta: 3.0,  phi: 1.3,  radius: 100, color: 0xff7043, lit: true  },
  { id: 'longing',    label: '念',  theta: 4.4,  phi: 0.75, radius: 100, color: 0xfdd835, lit: false },
  { id: 'mask',       label: '面',  theta: 5.5,  phi: 1.5,  radius: 100, color: 0x4db6ac, lit: false },
];

export const MEMORY_STARS = [
  { id: 'mem-01', personalityId: 'fear',       orbitRadius: 25, orbitAngle: 0.0,  orbitSpeed: 0.00004, lit: true  },
  { id: 'mem-02', personalityId: 'fear',       orbitRadius: 32, orbitAngle: 1.2,  orbitSpeed: 0.00003, lit: true  },
  { id: 'mem-03', personalityId: 'fear',       orbitRadius: 22, orbitAngle: 2.8,  orbitSpeed: 0.00005, lit: true  },
  { id: 'mem-04', personalityId: 'tenderness', orbitRadius: 28, orbitAngle: 0.5,  orbitSpeed: 0.00003, lit: true  },
  { id: 'mem-05', personalityId: 'tenderness', orbitRadius: 23, orbitAngle: 2.0,  orbitSpeed: 0.00004, lit: true  },
  { id: 'mem-06', personalityId: 'tenderness', orbitRadius: 35, orbitAngle: 3.8,  orbitSpeed: 0.00002, lit: true  },
  { id: 'mem-07', personalityId: 'defiance',   orbitRadius: 26, orbitAngle: 0.3,  orbitSpeed: 0.00004, lit: true  },
  { id: 'mem-08', personalityId: 'defiance',   orbitRadius: 20, orbitAngle: 1.9,  orbitSpeed: 0.00005, lit: true  },
  { id: 'mem-09', personalityId: 'defiance',   orbitRadius: 30, orbitAngle: 3.5,  orbitSpeed: 0.00003, lit: true  },
];
