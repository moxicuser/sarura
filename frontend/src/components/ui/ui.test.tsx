import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TextField, VerifiedBadge } from "./index";

describe("form fields", () => {
  it("connects the label, hint and error to the input", () => {
    render(
      <TextField
        label="Full name"
        hint="As written on your ID"
        error="This field is required"
        required
      />,
    );

    const input = screen.getByLabelText(/Full name/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/As written on your ID/);
    expect(input).toHaveAccessibleDescription(/This field is required/);
    expect(screen.getByRole("alert")).toHaveTextContent("This field is required");
  });
});

describe("verification badges", () => {
  it("names the verification level next to the only allowed check mark", () => {
    render(<VerifiedBadge level="identity" />);

    const badge = screen.getByText("Umwirondoro wasuzumwe");
    expect(badge).toBeInTheDocument();
    expect(badge.previousSibling).toHaveTextContent("✓");
  });

  it("shows no badge for unverified users", () => {
    const { container } = render(<VerifiedBadge level="unverified" />);

    expect(container).toBeEmptyDOMElement();
  });
});
