import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const schema = z.object({
  name: z.string().min(3, { error: "Name must be at least 3 characters" }),
  email: z.email({ error: "Invalid email address" }),
  password: z.string().min(8, { error: "Password must be at least 8 characters" }),
});

type FormData = z.infer<typeof schema>;

async function createUser(data: FormData) {
  const res = await axios.post("/api/users", data, { withCredentials: true });
  return res.data;
}

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewUserForm({ onSuccess, onCancel }: Props) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess();
    },
    onError: (err) => {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? err.message
        : "Something went wrong";
      setError("root", { message });
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      className="space-y-4"
      autoComplete="off"
    >
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          aria-invalid={!!errors.name}
          {...register("name")}
          placeholder="Jane Smith"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="off"
          aria-invalid={!!errors.email}
          {...register("email")}
          placeholder="jane@example.com"
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register("password")}
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {errors.root && (
        <p className="text-xs text-destructive">{errors.root.message}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? "Creating…" : "Create User"}
        </Button>
      </div>
    </form>
  );
}
