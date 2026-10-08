import type { CharacterEntry } from '../../scripts/characters/types';

// 직접 구성한 텍스트 모음. String.raw는 역슬래시와 문자 형태를 보존합니다.
const collections = [
  { id: 'happy', label: '행복·웃음', keywords: ['웃음', '행복', '기쁨', 'ㅋㅋ', 'ㅎㅎ'], text: String.raw`
(๑˃ᴗ˂)ﻭ
(*^▽^*)
(≧▽≦)
(＾▽＾)
(´▽\u0060)
ヽ(・∀・)ﾉ
٩(◕‿◕｡)۶
(｡♥‿♥｡)
ヾ(＠⌒ー⌒＠)ノ
(o˘◡˘o)
(✧ω✧)
(´｡• ᵕ •｡\u0060)
ᕕ( ᐛ )ᕗ
＼(^o^)／
♪┏(・o･)┛♪
(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧
ㅋㅋㅋ
ㅎㅎㅎ
^ㅁ^
^_^` },
  { id: 'love', label: '사랑·하트', keywords: ['사랑', '하트', '좋아', '포옹'], text: String.raw`
(づ｡◕‿‿◕｡)づ
(♡μ_μ)
(´♡‿♡\u0060)
(❤ω❤)
(ღ˘⌣˘ღ)
( ˘ ³˘)♥
ლ(´ڡ\u0060ლ)
(つ≧▽≦)つ
♡( ◡‿◡ )
(´｡• ω •｡\u0060) ♡
(っ˘з(˘⌣˘ )
( ˶ᵔ ᵕ ᵔ˶ )
(*˘︶˘*).｡.:*♡
(◍•ᴗ•◍)❤
♡〜٩( ˃́▿˂̀ )۶〜♡
(｡・//ε//・｡)
♥‿♥
♡.♡` },
  { id: 'sad', label: '슬픔·눈물', keywords: ['슬픔', '눈물', '울음', 'ㅠㅠ', '우울'], text: String.raw`
ㅠㅠ
ㅜㅜ
T_T
;ㅅ;
(╥﹏╥)
(ಥ﹏ಥ)
(｡•́︿•̀｡)
(ノ_<。)
(っ˘̩╭╮˘̩)っ
(｡T ω T｡)
(つω\u0060｡)
( ´•̥̥̥ω•̥̥̥\u0060 )
(个_个)
(っ˘̩╭╮˘̩)っ♡
(ಡ‸ಡ)
(；ω；)
orz
OTL` },
  { id: 'angry', label: '화남·짜증', keywords: ['화남', '짜증', '분노', '불만'], text: String.raw`
(╯°□°）╯︵ ┻━┻
┻━┻ ︵ヽ(\u0060Д´)ﾉ︵ ┻━┻
(＃\u0060Д´)
(눈_눈)
(╬ಠ益ಠ)
ಠ_ಠ
(ง •̀_•́)ง
٩(๑\u0060^´๑)۶
ヽ( \u0060д´*)ノ
(¬_¬)
(-_-メ)
(・\u0060ω´・)
(╬ Ò﹏Ó)
凸(￣ヘ￣)
(҂◡_◡)
o(>< )o
(￣ε￣＠)
ㅡㅡ` },
  { id: 'surprise', label: '놀람·당황', keywords: ['놀람', '당황', '충격', '헉'], text: String.raw`
Σ(°ロ°)
(⊙_⊙)
(ﾟДﾟ;)
(°ロ°) !
Σ(･ω･ﾉ)ﾉ
(꒪⌓꒪)
(・・;)
(⊙﹏⊙)
(＠_＠)
O_O
ㅇㅁㅇ
헐;ㅁ;
(⁄ ⁄•⁄ω⁄•⁄ ⁄)
(*/ω＼*)
(・_・ヾ
Σ(ಠ_ಠ)
(°ー°〃)
(⊙.☉)7` },
  { id: 'greeting', label: '인사·감사', keywords: ['인사', '감사', '안녕', '고마워', '응원'], text: String.raw`
(￣▽￣)ノ
ヾ(・ω・*)
(・∀・)ノ
( ´ ▽ \u0060 )ﾉ
(^０^)ノ
(*・ω・)ﾉ
(*´∀\u0060)ﾉ
(｡･ω･)ﾉﾞ
m(_ _)m
(_ _)
(シ_ _)シ
人(´∀\u0060)
(ㅅ´ ˘ \u0060)♡
(•̀ᴗ•́)و
ᕦ(ò_óˇ)ᕤ
٩(ˊᗜˋ*)و
(ง'̀-'́)ง
(*￣▽￣)b` },
  { id: 'cute', label: '귀여움', keywords: ['귀여움', '귀여운', '애교', '멍'], text: String.raw`
ㅇㅅㅇ
ʕ•ᴥ•ʔ
(｡•̀ᴗ-)✧
(๑•̀ㅂ•́)و✧
(๑•ᴗ•๑)
(•ө•)♡
( ˙꒳˙ )
(ꈍᴗꈍ)
(っ˘ω˘ς )
(◕‿◕)
(｡･ω･｡)
(๑˙―˙๑)
( ˙▿˙ )
(❁´◡\u0060❁)
(๑>◡<๑)
(っ ॑꒳ ॑c)
(∩˃o˂∩)♡
( ˘ω˘ )` },
  { id: 'animals', label: '동물', keywords: ['동물'], text: String.raw`
(=^･ω･^=)
(=^･ｪ･^=)
(=①ω①=)
ฅ(•ㅅ•❀)ฅ
ฅ^•ﻌ•^ฅ
/ᐠ｡ꞈ｡ᐟ\
U・ᴥ・U
U^ｪ^U
∪･ω･∪
ʕっ•ᴥ•ʔっ
ʕ•̀ω•́ʔ✧
ʕ •́؈•̀ ₎
／(･ × ･)＼
／(^ x ^)＼
ᘛ⁐̤ᕐᐷ
<°)))><
くコ:彡
(•ㅅ•)` },
  { id: 'other', label: '기타', keywords: ['기타', '무표정', '졸림', '신남', '모름'], text: String.raw`
¯\_(ツ)_/¯
┬─┬ノ( º _ ºノ)
(－_－) zzZ
(∪｡∪)｡｡｡zzZ
(￣o￣) . z Z
(・_・)
(・・ ) ?
(・・;)ゞ
(￢_￢;)
_(:3」∠)_
ε=ε=┏( >_<)┛
ᕕ( ಠ‿ಠ)ᕗ
(☞ﾟヮﾟ)☞
☜(ﾟヮﾟ☜)
☕(￣▽￣)
(ง ˙ω˙)ว
( •_•)>⌐■-■
(⌐■_■)` },
] as const;

export const kaomojiCategories = collections.map(({ id, label }) => ({ id, label }));
export const kaomoji: CharacterEntry[] = collections.flatMap((collection) =>
  collection.text.trim().split('\n').map((raw, index) => {
    // String.raw template 내의 backtick은 이 치환으로 원형을 복원합니다.
    const char = raw.trim().replaceAll('\\u0060', '`');
    return {
      id: `kaomoji-${collection.id}-${index}`, char,
      name: `${collection.label} 이모티콘 ${index + 1}`, koName: `${collection.label} 이모티콘`,
      keywords: [...collection.keywords, ...(collection.id === 'animals'
        ? [index < 6 || index === 17 ? '고양이' : index < 9 ? '강아지' : index < 12 ? '곰' : index < 14 ? '토끼' : index === 14 ? '쥐' : index === 15 ? '물고기' : '오징어']
        : [])], category: collection.id, categoryLabel: collection.label,
      subgroup: collection.id, variants: [],
    };
  }),
);
