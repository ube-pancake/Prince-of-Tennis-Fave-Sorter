export const schools = [
  { id: 'seigaku', name: 'Seigaku', short: 'SG', color: '#153fc0', accent: '#f5d23b' },
  { id: 'fudomine', name: 'Fudomine', short: 'FD', color: '#22282b', accent: '#f27b35' },
  { id: 'rudolph', name: 'St. Rudolph', short: 'SR', color: '#7c1b2f', accent: '#e8c9a5' },
  { id: 'yamabuki', name: 'Yamabuki', short: 'YB', color: '#2a6328', accent: '#f4cf3d' },
  { id: 'hyoutei', name: 'Hyoutei', short: 'HY', color: '#4b79b9', accent: '#e9eef8' },
  { id: 'rokkaku', name: 'Rokkaku', short: 'RK', color: '#c1642f', accent: '#efe2c2' },
  { id: 'rikkai', name: 'Rikkai', short: 'RKD', color: '#d5b631', accent: '#263f75' },
  { id: 'higa', name: 'Higa', short: 'HG', color: '#74449a', accent: '#ead8f5' },
  { id: 'shiten', name: 'Shitenhoji', short: 'ST', color: '#14704d', accent: '#e8dc63' },
  { id: 'u17', name: 'U-17', short: 'U17', color: '#7b2025', accent: '#efeee9' },
  { id: 'foreign', name: 'Foreign Teams', short: 'INT', color: '#234255', accent: '#75d7d1' },
  { id: 'other', name: 'Other', short: 'OTH', color: '#715e52', accent: '#e7d6be' },
]

const roster = {
  seigaku: ['Ryoma Echizen', 'Kunimitsu Tezuka', 'Shusuke Fuji', 'Eiji Kikumaru', 'Shuichiro Oishi', 'Sadaharu Inui', 'Takashi Kawamura', 'Takeshi Momoshiro', 'Kaoru Kaidoh'],
  fudomine: ['Kippei Tachibana', 'Akira Kamio', 'Shinji Ibu', 'Tetsu Ishida', 'Masaya Sakurai'],
  rudolph: ['Hajime Mizuki', 'Yuta Fuji', 'Yoshirou Akazawa', 'Ichiro Kaneda', 'Atsushi Kisarazu'],
  yamabuki: ['Jin Akutsu', 'Kiyosumi Sengoku', 'Taichi Dan', 'Kentaro Minami', 'Masami Higashikata'],
  hyoutei: ['Keigo Atobe', 'Yushi Oshitari', 'Gakuto Mukahi', 'Ryo Shishido', 'Chotaro Ohtori', 'Jiro Akutagawa', 'Munehiro Kabaji', 'Wakashi Hiyoshi'],
  rokkaku: ['Kentaro Aoi', 'Kojiro Saeki', 'Hikaru Amane', 'Harukaze Kurobane', 'Marehiko Itsuki'],
  rikkai: ['Seiichi Yukimura', 'Genichiro Sanada', 'Renji Yanagi', 'Akaya Kirihara', 'Masaharu Niou', 'Hiroshi Yagyuu', 'Bunta Marui', 'Jackal Kuwahara'],
  higa: ['Eishiro Kite', 'Rin Hirakoba', 'Yujiro Kai', 'Hiroshi Chinen', 'Kei Tanishi'],
  shiten: ['Kuranosuke Shiraishi', 'Kintaro Toyama', 'Senri Chitose', 'Kenya Oshitari', 'Hikaru Zaizen', 'Gin Ishida', 'Koharu Konjiki', 'Yuuji Hitouji'],
  u17: ['Byodoin Phoenix', 'Kazuya Tokugawa', 'Jujiro Oni', 'Kanata Irie', 'Shuji Tanegashima', 'Duke Watanabe', 'Ryoga Echizen'],
  foreign: ['Jürgen Volk', 'Q.P.', 'Zeus Iliopoulos', 'Leopold Camus', 'Alexander Amadeus'],
  other: ['Nanjiro Echizen', 'Sasabe', 'Reiji Kamishiro', 'Tsubasa Hanamura'],
}

const slugify = (value) => value.toLowerCase().replace(/[.']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export const players = Object.entries(roster).flatMap(([schoolId, names]) =>
  names.map((name, index) => ({
    id: `${schoolId}-${slugify(name)}`,
    name,
    schoolId,
    seed: index,
    image: `/players/${schoolId}/${slugify(name)}.webp`,
  })),
)

export const schoolMap = Object.fromEntries(schools.map((school) => [school.id, school]))
