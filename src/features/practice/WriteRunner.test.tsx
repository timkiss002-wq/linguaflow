import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WriteItem } from "@/lib/practice/items";
import { WriteRunner } from "./WriteRunner";

const active: WriteItem[] = [
  "I like apples.",
  "She reads books.",
  "We play football.",
  "They watch films.",
  "He drinks tea.",
].map((en, i) => ({ key: `a${i}`, prompt: `câu ${i}`, en: [en] }));
const passive: WriteItem = {
  key: "p0",
  prompt: "câu thụ động",
  en: ["The sky is blue."],
  graded: false,
};

function answer(text: string) {
  fireEvent.change(screen.getByLabelText("Câu của bạn"), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: /Kiểm tra/ }));
}
const next = () =>
  fireEvent.click(screen.getByRole("button", { name: /Câu tiếp|Xem kết quả/ }));

describe("WriteRunner — redo only the wrong sentences", () => {
  it("below 50 % asks to redo only the active sentences wrong the first time; a passive one only has to end right", () => {
    localStorage.clear();
    const onFinish = vi.fn();
    render(
      <WriteRunner
        items={[...active, passive]}
        mode="translate"
        heading="t"
        onFinish={onFinish}
        storageKey="t1"
      />,
    );
    // a0, a1 wrong on the first try (a1 then fixed on the second try — still counts as wrong)
    answer("nope");
    next();
    answer("nope");
    fireEvent.click(screen.getByRole("button", { name: /Sửa lại/ }));
    answer("She reads books.");
    next();
    answer("nope");
    next();
    for (const it of active.slice(3)) {
      answer(it.en[0]!);
      next();
    }
    // passive: wrong, then right on the second try → fine
    answer("nope");
    fireEvent.click(screen.getByRole("button", { name: /Sửa lại/ }));
    answer("The sky is blue.");
    next();
    expect(onFinish).toHaveBeenLastCalledWith(2, 5, expect.anything(), false);
    expect(
      screen.getByRole("button", { name: /Làm lại 3 câu sai/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Làm lại cả bài/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Làm lại 3 câu sai/ }));
    expect(screen.getByTestId("prompt")).toHaveTextContent("câu 0");
    answer("I like apples.");
    next();
    expect(screen.getByTestId("prompt")).toHaveTextContent("câu 1");
    answer("She reads books.");
    next();
    answer(active[2]!.en[0]!);
    next();
    expect(onFinish).toHaveBeenLastCalledWith(2, 5, expect.anything(), true);
    expect(screen.getByTestId("run-status")).toHaveTextContent("Đạt");
  });

  it("at ≥ 50 % passes without redoing, but a passive sentence still wrong comes back", () => {
    localStorage.clear();
    const onFinish = vi.fn();
    render(
      <WriteRunner
        items={[...active, passive]}
        mode="translate"
        heading="t"
        onFinish={onFinish}
      />,
    );
    answer("nope");
    next();
    for (const it of active.slice(1)) {
      answer(it.en[0]!);
      next();
    }
    answer("nope");
    next();
    expect(onFinish).toHaveBeenLastCalledWith(4, 5, expect.anything(), false);
    fireEvent.click(screen.getByRole("button", { name: /Làm lại 1 câu sai/ }));
    expect(screen.getByTestId("prompt")).toHaveTextContent("câu thụ động");
    answer("nope");
    fireEvent.click(screen.getByRole("button", { name: /Sửa lại/ }));
    answer("The sky is blue.");
    next();
    expect(onFinish).toHaveBeenLastCalledWith(4, 5, expect.anything(), true);
  });

  it("keeps the run when the page is left and opened again", () => {
    localStorage.clear();
    const { unmount } = render(
      <WriteRunner
        items={active}
        mode="translate"
        heading="t"
        onFinish={() => undefined}
        storageKey="t3"
      />,
    );
    for (let i = 0; i < active.length; i++) {
      answer("nope");
      next();
    }
    unmount();
    render(
      <WriteRunner
        items={active}
        mode="translate"
        heading="t"
        onFinish={() => undefined}
        storageKey="t3"
      />,
    );
    expect(
      screen.getByRole("button", { name: /Làm lại 5 câu sai/ }),
    ).toBeInTheDocument();
  });
});
