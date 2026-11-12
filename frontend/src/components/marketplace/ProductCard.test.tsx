import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProductCard } from "./ProductCard";
import { makeProduct } from "../../test/apiMock";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProductCard", () => {
  it("shows the crop, price, quantity, location and farmer verification", () => {
    render(
      <MemoryRouter>
        <ProductCard product={makeProduct()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Ibishyimbo" })).toBeInTheDocument();
    expect(screen.getByText("Imboga")).toBeInTheDocument();
    expect(screen.getByText("650 RWF/kg")).toBeInTheDocument();
    expect(screen.getByText(/500 kg/)).toBeInTheDocument();
    expect(screen.getByText(/Gasabo/)).toBeInTheDocument();
    expect(screen.getByText("Umwirondoro wasuzumwe")).toBeInTheDocument();
    expect(screen.getByText(/Aline Uwase/)).toBeInTheDocument();
  });

  it("links to the product page and handles a listing without a photo", () => {
    render(
      <MemoryRouter>
        <ProductCard product={makeProduct({ id: 42, primary_image: null })} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/42");
    expect(screen.getByText("Nta foto")).toBeInTheDocument();
  });

  it("hides the verification badge for an unverified farmer", () => {
    render(
      <MemoryRouter>
        <ProductCard
          product={makeProduct({
            farmer: {
              ...makeProduct().farmer,
              verification_level: "unverified",
              is_verified_farmer: false,
            },
          })}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Konti yemejwe")).not.toBeInTheDocument();
    expect(screen.queryByText("Umwirondoro wasuzumwe")).not.toBeInTheDocument();
  });
});
