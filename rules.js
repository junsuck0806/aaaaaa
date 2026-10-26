// 모드 제목의 키워드로 종류를 나누는 규칙입니다.
// words: 영어는 단어 단위로, 한글은 포함 여부로 찾습니다. 자유롭게 추가/수정하세요.
// risk: 'high' | 'mid' | 'low'  (같은 종류끼리 겹쳤을 때의 주의 정도)
const CATEGORIES = [
  {
    key: 'map', label: '맵', risk: 'high',
    words: ['map', 'maps', 'island', '맵'],
    note: '같은 좌표(셀)를 건드리는 맵끼리 겹치면 건물이 사라지거나 오류가 날 수 있습니다. 맵 로드 순서도 영향을 줍니다.'
  },
  {
    key: 'overhaul', label: '대규모 개편', risk: 'high',
    words: ['overhaul', 'rework', 'reworked', 'expansion', 'total conversion'],
    note: '게임 시스템 전체를 바꾸는 모드는 같은 Lua 함수를 덮어쓰는 경우가 많아 서로 겹치기 쉽습니다.'
  },
  {
    key: 'ui', label: 'UI·인벤토리', risk: 'high',
    words: ['ui', 'hud', 'interface', 'menu', 'tooltip', 'inventory', '인터페이스'],
    note: '같은 UI 코드를 덮어쓰는 모드끼리는 마지막에 로드된 쪽만 적용되거나 오류가 날 수 있습니다.'
  },
  {
    key: 'zombie', label: '좀비 설정', risk: 'mid',
    words: ['zombie', 'zombies', 'zed', 'zeds', 'spawn', 'spawns', 'horde', 'hordes', '좀비'],
    note: '좀비 스폰·행동·인구 값을 바꾸는 모드끼리는 서로의 설정을 덮어쓸 수 있습니다.'
  },
  {
    key: 'vehicle', label: '차량', risk: 'mid',
    words: ['vehicle', 'vehicles', 'car', 'cars', 'truck', 'trucks', 'van', 'vans', 'bus', 'motorcycle', 'motorcycles', '차량'],
    note: '차량 추가 모드는 대체로 독립적이지만, 차량 물리·정비 시스템을 바꾸는 모드끼리는 겹칠 수 있습니다.'
  },
  {
    key: 'weapon', label: '무기·총기', risk: 'mid',
    words: ['weapon', 'weapons', 'gun', 'guns', 'firearm', 'firearms', 'rifle', 'pistol', 'ammo', 'melee', '무기', '총기'],
    note: '같은 기본 아이템, 레시피, 탄약 규칙을 수정하는 모드끼리 겹칠 수 있습니다.'
  },
  {
    key: 'skill', label: '스킬·특성·직업', risk: 'mid',
    words: ['skill', 'skills', 'trait', 'traits', 'profession', 'professions', 'occupation', 'occupations', 'xp', '스킬', '특성', '직업'],
    note: '특성·직업·경험치 규칙을 바꾸는 모드끼리 값이 덮어쓰일 수 있습니다.'
  },
  {
    key: 'food', label: '음식·요리·농사', risk: 'mid',
    words: ['food', 'foods', 'cook', 'cooking', 'recipe', 'recipes', 'farming', 'crop', 'crops', '음식', '요리', '농사'],
    note: '요리·농사 시스템을 확장하는 모드는 같은 레시피나 아이템을 수정할 수 있습니다.'
  },
  {
    key: 'build', label: '건축·제작', risk: 'mid',
    words: ['build', 'building', 'craft', 'crafting', 'construction', 'furniture', 'barricade', 'barricades', '건축', '제작'],
    note: '같은 건축/제작 메뉴를 건드리는 모드끼리 겹칠 수 있습니다.'
  },
  {
    key: 'clothing', label: '의류·가방', risk: 'low',
    words: ['clothing', 'clothes', 'outfit', 'outfits', 'backpack', 'backpacks', 'bag', 'bags', 'armor', 'armour', '의류', '가방'],
    note: '대부분 독립적이지만, 같은 착용 슬롯이나 인벤토리 규칙을 바꾸면 겹칠 수 있습니다.'
  },
  {
    key: 'media', label: '사운드·그래픽', risk: 'low',
    words: ['sound', 'sounds', 'music', 'audio', 'texture', 'textures', 'visual', 'visuals', 'lighting', 'weather', '사운드'],
    note: '같은 파일을 교체하는 모드끼리는 마지막에 로드된 쪽만 적용됩니다.'
  },
  {
    key: 'lang', label: '번역', risk: 'low',
    words: ['translation', 'translations', 'korean', 'language', '번역', '한글'],
    note: '같은 언어 파일을 교체하는 번역 모드끼리는 한쪽만 적용됩니다.'
  }
];

// 직접 확인한 충돌을 여기에 등록하세요. 분석 결과에 그대로 표시됩니다.
// a, b: 워크샵 ID(숫자), Mod ID, 또는 제목에 들어 있는 키워드
const KNOWN_CONFLICTS = [
  // { a: '워크샵ID 또는 키워드', b: '워크샵ID 또는 키워드', reason: '충돌 내용 메모' },
];
