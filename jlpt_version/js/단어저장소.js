/*
 * 단어 데이터를 읽어 오는 모듈.
 *
 * 데이터/words.json 의 형식은 사용자가 직접 늘릴 수 있게 단순하게 유지한다.
 *   { "level": "N5", "word": "青白い", "reading": "あおじろい",
 *     "meaning": "창백하다",
 *     "kanji": [{ "char": "青", "hunum": "푸를 청" }, ...] }
 *
 * 여기서 화면이 쓰기 좋은 모양으로 한 번 손질한다.
 *   식별자    급수와 단어를 합친 저장용 열쇠 (localStorage 에 이것만 남긴다)
 *   글자들    단어를 한 글자씩 끊고, 한자면 훈음을 붙인 배열
 *   한자있음  훈음 버튼을 켤 수 있는지
 *   읽는법다름  가나로만 된 단어는 읽는 법이 단어와 같아서 히라가나 버튼이 의미 없다
 */

const 데이터경로 = "데이터/words.json";

/** 화면에 보여 줄 급수 순서. words.json 에 없는 급수는 앱이 알아서 건너뛴다. */
export const 급수목록 = ["N5", "N4", "N3"];

let 단어들 = [];

/** words.json 한 항목이 쓸 만한지 검사한다. 틀린 항목은 건너뛰고 콘솔에 알린다. */
function 쓸만한항목인가(항목, 번호) {
  const 필수 = ["level", "word", "reading", "meaning"];
  for (const 이름 of 필수) {
    if (typeof 항목?.[이름] !== "string" || 항목[이름] === "") {
      console.warn(`words.json ${번호}번 항목에 "${이름}" 이 없어서 건너뜁니다.`, 항목);
      return false;
    }
  }
  if (항목.kanji !== undefined && !Array.isArray(항목.kanji)) {
    console.warn(`words.json ${번호}번 항목의 "kanji" 가 배열이 아니라서 건너뜁니다.`, 항목);
    return false;
  }
  return true;
}

/** 한 항목을 화면이 쓰는 모양으로 손질한다. */
function 손질하기(항목) {
  const 한자목록 = Array.isArray(항목.kanji) ? 항목.kanji : [];

  /*
   * 글자 → 훈음 표를 만든다.
   * 같은 한자가 한 단어에 두 번 나오면(예: 々 를 쓰지 않고 겹쳐 쓴 경우)
   * 훈음도 같으므로 먼저 나온 것을 모든 자리에 쓴다.
   */
  const 훈음표 = new Map();
  for (const 한자 of 한자목록) {
    if (typeof 한자?.char === "string" && typeof 한자?.hunum === "string" && !훈음표.has(한자.char)) {
      훈음표.set(한자.char, 한자.hunum);
    }
  }

  // [...문자열] 로 끊어야 서로게이트 쌍(일부 희귀 한자)이 쪼개지지 않는다.
  const 글자들 = [...항목.word].map((글자) => ({
    글자,
    훈음: 훈음표.get(글자) ?? null,
  }));

  return {
    식별자: `${항목.level}|${항목.word}`,
    급수: 항목.level,
    단어: 항목.word,
    읽는법: 항목.reading,
    뜻: 항목.meaning,
    글자들,
    한자있음: 글자들.some((하나) => 하나.훈음 !== null),
    읽는법다름: 항목.reading !== 항목.word,
  };
}

/** words.json 을 읽어 들인다. 앱이 시작할 때 한 번만 부른다. */
export async function 불러오기() {
  const 응답 = await fetch(데이터경로, { cache: "no-cache" });
  if (!응답.ok) {
    throw new Error(`${데이터경로} 를 읽지 못했습니다. (HTTP ${응답.status})`);
  }

  const 자료 = await 응답.json();
  if (!Array.isArray(자료)) {
    throw new Error(`${데이터경로} 의 가장 바깥은 [ ] 배열이어야 합니다.`);
  }

  단어들 = 자료.filter(쓸만한항목인가).map(손질하기);
  if (단어들.length === 0) {
    throw new Error(`${데이터경로} 에서 쓸 수 있는 단어를 찾지 못했습니다.`);
  }
  return 단어들.length;
}

/** 한 급수의 단어를 words.json 에 적힌 순서대로 돌려준다. */
export function 급수단어(급수) {
  return 단어들.filter((하나) => 하나.급수 === 급수);
}

/** words.json 에 실제로 들어 있는 급수만 골라 순서대로 돌려준다. */
export function 있는급수() {
  const 있는것 = new Set(단어들.map((하나) => 하나.급수));
  const 앞쪽 = 급수목록.filter((급수) => 있는것.has(급수));
  // words.json 에 N2 처럼 새 급수를 넣어도 버튼이 나오게 뒤에 붙인다.
  const 나머지 = [...있는것].filter((급수) => !급수목록.includes(급수)).sort();
  return [...앞쪽, ...나머지];
}
