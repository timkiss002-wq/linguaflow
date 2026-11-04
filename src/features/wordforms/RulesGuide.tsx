import { PosBadge } from '@/features/vocabulary/PosBadge';
import { TRAP_INFO, type Family } from '@/lib/wordforms';

const SUFFIXES = [
  { pos: 'noun', items: '-tion, -sion, -ment, -ness, -ity, -ance/-ence, -ship, -er/-or/-ist (người), -ism, -hood' },
  { pos: 'verb', items: '-ize/-ise, -ify, -en (widen, strengthen), -ate (accelerate)' },
  { pos: 'adj', items: '-ive, -ous, -al, -ic/-ical, -able/-ible, -ful, -less, -ent/-ant, -y' },
  { pos: 'adv', items: 'thường là tính từ + -ly (quickly, significantly) — nhưng xem bẫy -ly bên dưới' },
] as const;

const POSITIONS = [
  { pos: 'noun', clue: 'sau a/an/the, tính từ sở hữu (my, their), tính từ, số lượng (many, a lot of); sau giới từ; làm chủ ngữ/tân ngữ', ex: 'a sharp [increase] · the [importance] of' },
  { pos: 'adj', clue: 'trước danh từ; sau be/become/seem/look/feel; sau more/most/very/extremely', ex: 'a [significant] change · is very [reliable]' },
  { pos: 'adv', clue: 'bổ nghĩa cho động từ, tính từ hoặc cả câu; thường đứng sau động từ thường hoặc trước tính từ', ex: 'rose [significantly] · [environmentally] friendly' },
  { pos: 'verb', clue: 'sau chủ ngữ; sau to, can/will/must/should; chia theo chủ ngữ (+s) và thì', ex: 'must [reduce] · The report [emphasizes]' },
] as const;

export function RulesGuide({ families }: { families: Family[] }) {
  return (
    <div className="space-y-6 text-sm">
      <section>
        <h2 className="mb-2 text-base font-semibold">1. Nhìn vị trí trong câu trước</h2>
        <p className="mb-3 text-muted-foreground">Trong IELTS, vị trí quyết định loại từ — kể cả khi bạn chưa biết nghĩa.</p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[560px]">
            <tbody className="divide-y">
              {POSITIONS.map((p) => (
                <tr key={p.pos} className="align-top">
                  <td className="w-20 p-3">
                    <PosBadge pos={p.pos} />
                  </td>
                  <td className="p-3">{p.clue}</td>
                  <td className="p-3 text-muted-foreground">{p.ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-base font-semibold">2. Rồi nhìn hậu tố</h2>
        <ul className="space-y-2">
          {SUFFIXES.map((s) => (
            <li key={s.pos} className="flex gap-3">
              <PosBadge pos={s.pos} className="h-fit" />
              <span>{s.items}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-base font-semibold">3. Các bẫy hay gặp</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(TRAP_INFO).map(([key, t]) => {
            const words = families.filter((f) => f.traps.includes(key)).map((f) => f.id);
            return (
              <div key={key} className="rounded-lg border bg-card p-3" data-trap={key}>
                <p className="font-medium">{t.title}</p>
                <p className="mt-1 text-muted-foreground">{t.tip}</p>
                {words.length > 0 && <p className="mt-2 text-xs">Families: {words.join(', ')}</p>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
