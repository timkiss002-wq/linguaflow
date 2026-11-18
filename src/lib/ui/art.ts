/**
 * Picks a cover-art motif (see features/passage3/CoverArt) from a passage title, so a reading card shows a drawing of
 * its topic instead of a generic book. The first rule that matches wins; unknown topics get a book.
 */
const RULES: [RegExp, string][] = [
  [/\b(bees?|plants?|forests?|trees?|gardens?|farm\w*|crops?|leaf|leaves|seeds?)\b/i, 'leaf'],
  [/\b(birds?|animals?|insects?|wildlife|species)\b/i, 'bird'],
  [/\b(sleep|memory|brain|mind|psycholog\w*|think\w*|habits?)\b/i, 'brain'],
  [/\b(languages?|world'?s?|global\w*|cultures?|countries)\b/i, 'globe'],
  [/\b(trams?|transport\w*|roads?|cars?|traffic|travel\w*|railways?|trains?)\b/i, 'road'],
  [/\b(ships?|boats?|oceans?|seas?|voyages?)\b/i, 'ship'],
  [/\b(water|rivers?|waves?|rain\w*|floods?)\b/i, 'wave'],
  [/\b(cit(y|ies)|urban|rooftops?|streets?)\b/i, 'city'],
  [/\b(museums?|schools?|universit\w*|architect\w*|buildings?)\b/i, 'building'],
  [/\b(science|chemi\w*|lab\w*|experiments?|medicine|medical)\b/i, 'flask'],
  [/\b(computers?|tech\w*|digital|robots?|internet|machines?)\b/i, 'chip'],
  [/\b(time|clocks?|procrastinat\w*|put things off|history|ancient)\b/i, 'clock'],
  [/\b(money|econom\w*|trade|prices?|business)\b/i, 'coin'],
  [/\b(music|songs?|art|paint\w*)\b/i, 'music'],
  [/\b(energy|batter\w*|electric\w*|solar|power)\b/i, 'battery'],
  [/\b(space|stars?|planets?|astronom\w*)\b/i, 'star'],
  [/\b(sun|climate|weather|heat)\b/i, 'sun'],
  [/\b(mountains?|volcano\w*|earth|rocks?)\b/i, 'mountain'],
  [/\b(people|social|child\w*|famil\w*|communit\w*|communicat\w*)\b/i, 'people'],
  [/\b(data|charts?|statistic\w*|numbers?)\b/i, 'chart'],
];

export function artFor(text: string): string {
  return RULES.find(([re]) => re.test(text))?.[1] ?? 'book';
}
