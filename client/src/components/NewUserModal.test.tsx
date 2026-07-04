import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import axios from "axios";
import { NewUserModal } from "./NewUserModal";
import { renderWithQuery } from "../test/renderWithQuery";

vi.mock("axios");

describe("NewUserModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the heading", () => {
    renderWithQuery(<NewUserModal onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "New User" })).toBeInTheDocument();
  });

  it("renders the form fields", () => {
    renderWithQuery(<NewUserModal onClose={vi.fn()} />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("calls onClose when the ✕ button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithQuery(<NewUserModal onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the backdrop overlay is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithQuery(<NewUserModal onClose={onClose} />);
    await user.click(screen.getByTestId("modal-overlay"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithQuery(<NewUserModal onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose after successful form submission", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    vi.mocked(axios).post = vi.fn().mockResolvedValue({ data: { user: {} } });
    vi.mocked(axios).isAxiosError = vi.fn().mockReturnValue(false);
    renderWithQuery(<NewUserModal onClose={onClose} />);
    await user.type(screen.getByLabelText("Name"), "Jane Smith");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    fireEvent.submit(screen.getByRole("button", { name: "Create User" }).closest("form")!);
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
});
