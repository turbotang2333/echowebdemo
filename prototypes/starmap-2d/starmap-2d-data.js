// 2D star map data — tighter layout within a circular boundary.

export const MAP_RADIUS = 160;

export const NEBULA = {
  id: 'nebula-hint',
  x: -45,
  y: 55,
  color: 0xb388ff,
  baseScale: 45,
  ringCount: 5,
  answerIds: ['mem-02', 'mem-05', 'mem-07'],
};

export const PERSONALITY_STARS = [
  { id: 'fear',       label: '惧', x: -75, y: -20,  color: 0x7c4dff, lit: true  },
  { id: 'tenderness', label: '柔', x:  30, y: -80,  color: 0x81d4fa, lit: true  },
  { id: 'defiance',   label: '逆', x:  90, y:  20,  color: 0xff7043, lit: true  },
  { id: 'longing',    label: '念', x: -10, y:  90,  color: 0xfdd835, lit: false },
  { id: 'mask',       label: '面', x:  60, y:  75,  color: 0x4db6ac, lit: false },
];

export const MEMORY_STARS = [
  { id: 'mem-01', personalityId: 'fear',       orbitRadius: 22, orbitAngle: 0.0,  orbitSpeed: 0.00015, lit: true  },
  { id: 'mem-02', personalityId: 'fear',       orbitRadius: 28, orbitAngle: 1.2,  orbitSpeed: 0.00012, lit: true  },
  { id: 'mem-03', personalityId: 'fear',       orbitRadius: 19, orbitAngle: 2.8,  orbitSpeed: 0.00018, lit: true  },
  { id: 'mem-04', personalityId: 'tenderness', orbitRadius: 24, orbitAngle: 0.5,  orbitSpeed: 0.00013, lit: true  },
  { id: 'mem-05', personalityId: 'tenderness', orbitRadius: 20, orbitAngle: 2.0,  orbitSpeed: 0.00016, lit: true  },
  { id: 'mem-06', personalityId: 'tenderness', orbitRadius: 30, orbitAngle: 3.8,  orbitSpeed: 0.00010, lit: true  },
  { id: 'mem-07', personalityId: 'defiance',   orbitRadius: 23, orbitAngle: 0.3,  orbitSpeed: 0.00015, lit: true  },
  { id: 'mem-08', personalityId: 'defiance',   orbitRadius: 18, orbitAngle: 1.9,  orbitSpeed: 0.00018, lit: true  },
  { id: 'mem-09', personalityId: 'defiance',   orbitRadius: 26, orbitAngle: 3.5,  orbitSpeed: 0.00012, lit: true  },
];
