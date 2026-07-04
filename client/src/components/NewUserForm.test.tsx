import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import axios from "axios";
import { NewUserForm } from "./NewUserForm";
import { renderWithQuery } from "../test/renderWithQuery";

vi.mock("axios");
const mockedAxios = vi.mocked(axios);

function renderForm(onSuccess = vi.fn(), onCancel = vi.fn()) {
  renderWithQuery(<NewUserForm onSuccess={onSuccess} onCancel={onCancel} />);
  return { onSuccess, onCancel };
}

async function fillAndSubmit(name: string, email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), name);
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  // fireEvent.submit bypasses HTML5 constraint validation so Zod handles all errors
  fireEvent.submit(screen.getByRole("button", { name: "Create User" }).closest("form")!);
}

describe("NewUserForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all fields and buttons", () => {
    renderForm();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create User" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderForm();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  describe("validation", () => {
    it("shows error when name is shorter than 3 characters", async () => {
      renderForm();
      await fillAndSubmit("ab", "jane@example.com", "password123");
      await waitFor(() =>
        expect(screen.getByText("Name must be at least 3 characters")).toBeInTheDocument()
      );
    });

    it("shows error for invalid email", async () => {
      renderForm();
      await fillAndSubmit("Jane Smith", "not-an-email", "password123");
      await waitFor(() =>
        expect(screen.getByText("Invalid email address")).toBeInTheDocument()
      );
    });

    it("shows error when password is shorter than 8 characters", async () => {
      renderForm();
      await fillAndSubmit("Jane Smith", "jane@example.com", "short");
      await waitFor(() =>
        expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument()
      );
    });

    it("does not call POST when validation fails", async () => {
      mockedAxios.post = vi.fn();
      renderForm();
      await fillAndSubmit("ab", "not-an-email", "short");
      await waitFor(() =>
        expect(screen.getByText("Name must be at least 3 characters")).toBeInTheDocument()
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe("successful submission", () => {
    it("POSTs to /api/users with credentials", async () => {
      mockedAxios.post = vi.fn().mockResolvedValue({ data: { user: {} } });
      renderForm();
      await fillAndSubmit("Jane Smith", "jane@example.com", "password123");
      await waitFor(() =>
        expect(mockedAxios.post).toHaveBeenCalledWith(
          "/api/users",
          { name: "Jane Smith", email: "jane@example.com", password: "password123" },
          { withCredentials: true }
        )
      );
    });

    it("calls onSuccess after the request resolves", async () => {
      mockedAxios.post = vi.fn().mockResolvedValue({ data: { user: {} } });
      const { onSuccess } = renderForm();
      await fillAndSubmit("Jane Smith", "jane@example.com", "password123");
      await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    });
  });

  describe("failed submission", () => {
    it("shows server error message from the response body", async () => {
      const err = Object.assign(new Error("Bad Request"), {
        isAxiosError: true,
        response: { data: { message: "User already exists. Use another email." } },
      });
      mockedAxios.post = vi.fn().mockRejectedValue(err);
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);
      renderForm();
      await fillAndSubmit("Jane Smith", "existing@example.com", "password123");
      await waitFor(() =>
        expect(screen.getByTestId("form-root-error")).toHaveTextContent(
          "User already exists. Use another email."
        )
      );
    });

    it("shows generic message for non-axios errors", async () => {
      mockedAxios.post = vi.fn().mockRejectedValue(new Error("Network Error"));
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(false);
      renderForm();
      await fillAndSubmit("Jane Smith", "jane@example.com", "password123");
      await waitFor(() =>
        expect(screen.getByTestId("form-root-error")).toHaveTextContent("Something went wrong")
      );
    });

    it("does not call onSuccess when the request fails", async () => {
      mockedAxios.post = vi.fn().mockRejectedValue(new Error("Network Error"));
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(false);
      const { onSuccess } = renderForm();
      await fillAndSubmit("Jane Smith", "jane@example.com", "password123");
      await waitFor(() =>
        expect(screen.getByTestId("form-root-error")).toBeInTheDocument()
      );
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
