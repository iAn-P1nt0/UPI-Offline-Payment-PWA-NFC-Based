import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage integration", () => {
  it("shows primary hero content and CTA links", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: /UPI Offline Pay/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Secure payments, even without internet/i)
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Login/i })).toHaveAttribute(
      "href",
      "/auth/login"
    );
    expect(screen.getByRole("link", { name: /Create Account/i })).toHaveAttribute(
      "href",
      "/auth/register"
    );
  });
});
