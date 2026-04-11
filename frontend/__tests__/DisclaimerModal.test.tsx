import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import DisclaimerModal from "../app/components/DisclaimerModal";

describe("DisclaimerModal", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("shows the modal when disclaimer has not been dismissed", () => {
    render(<DisclaimerModal />);
    expect(screen.getByText("Important Notice")).toBeInTheDocument();
  });

  it("does not show the modal when sessionStorage flag is set", () => {
    sessionStorage.setItem("prelegal_disclaimer_shown", "1");
    render(<DisclaimerModal />);
    expect(screen.queryByText("Important Notice")).not.toBeInTheDocument();
  });

  it("hides the modal when the button is clicked", () => {
    render(<DisclaimerModal />);
    fireEvent.click(screen.getByRole("button", { name: /I understand/i }));
    expect(screen.queryByText("Important Notice")).not.toBeInTheDocument();
  });

  it("sets sessionStorage flag when dismissed", () => {
    render(<DisclaimerModal />);
    fireEvent.click(screen.getByRole("button", { name: /I understand/i }));
    expect(sessionStorage.getItem("prelegal_disclaimer_shown")).toBe("1");
  });
});
