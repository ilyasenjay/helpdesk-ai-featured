import { screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import axios from "axios";
import UsersPage from "./UsersPage";
import type { User } from "../components/UsersTable";
import { renderWithQuery } from "../test/renderWithQuery";

vi.mock("axios");
const mockedAxios = vi.mocked(axios);

const USERS: User[] = [
  {
    id: "1",
    name: "Alice Admin",
    email: "alice@example.com",
    role: "admin",
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "2",
    name: "Bob Agent",
    email: "bob@example.com",
    role: "agent",
    createdAt: "2024-03-20T00:00:00.000Z",
  },
];

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page heading", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { users: [] } });
    renderWithQuery(<UsersPage />);
    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
  });

  it("shows the skeleton while loading", () => {
    mockedAxios.get = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    renderWithQuery(<UsersPage />);
    // Skeleton renders column headers while data loads
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Joined")).toBeInTheDocument();
  });

  it("renders a row for each user after loading", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { users: USERS } });
    renderWithQuery(<UsersPage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Admin")).toBeInTheDocument();
      expect(screen.getByText("Bob Agent")).toBeInTheDocument();
    });
  });

  it("renders user emails", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { users: USERS } });
    renderWithQuery(<UsersPage />);
    await waitFor(() => {
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    });
  });

  it("renders role badges", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { users: USERS } });
    renderWithQuery(<UsersPage />);
    await waitFor(() => {
      expect(screen.getByText("admin")).toBeInTheDocument();
      expect(screen.getByText("agent")).toBeInTheDocument();
    });
  });

  it("renders formatted join dates", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { users: USERS } });
    renderWithQuery(<UsersPage />);
    await waitFor(() => {
      expect(
        screen.getByText(new Date("2024-01-15T00:00:00.000Z").toLocaleDateString())
      ).toBeInTheDocument();
    });
  });

  it("shows empty state when there are no users", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { users: [] } });
    renderWithQuery(<UsersPage />);
    await waitFor(() => {
      expect(screen.getByText("No users found.")).toBeInTheDocument();
    });
  });

  it("shows an error message when the request fails", async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error("Network Error"));
    renderWithQuery(<UsersPage />);
    await waitFor(() => {
      expect(screen.getByText("Network Error")).toBeInTheDocument();
    });
  });

  it("calls GET /api/users with credentials", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { users: [] } });
    renderWithQuery(<UsersPage />);
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith("/api/users", {
        withCredentials: true,
      });
    });
  });
});
