import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { NotFoundPage } from "./NotFoundPage";

describe("NotFoundPage", () => {
  it("explains the 404 and offers a way back", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Iyi paji ntabwo ibonetse" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reba isoko" })).toHaveAttribute(
      "href",
      "/marketplace",
    );
    expect(screen.getByRole("link", { name: "Subira ahabanza" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
