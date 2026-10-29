import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HistoryNav from "./HistoryNav";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
  useLocation: () => ({ pathname: "/admin/alunos" }),
}));
afterEach(() => { cleanup(); navigate.mockClear(); window.history.replaceState(null, ""); });

describe("panel history navigation", () => {
  it("goes back one visited page", () => {
    window.history.replaceState({ idx: 2 }, "");
    render(<HistoryNav />);
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(navigate).toHaveBeenCalledWith(-1);
  });
  it("opens the dashboard when the page was opened directly", () => {
    window.history.replaceState({ idx: 0 }, "");
    render(<HistoryNav />);
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(navigate).toHaveBeenCalledWith("/admin");
  });
  it("advances one page in browser history", () => {
    render(<HistoryNav />);
    fireEvent.click(screen.getByRole("button", { name: "Avançar" }));
    expect(navigate).toHaveBeenCalledWith(1);
  });
});