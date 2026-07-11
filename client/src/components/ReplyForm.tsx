import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { FormRootError } from "./FormRootError";
import { getErrorMessage } from "../lib/errors";
import type { Message, TicketDetail } from "../lib/tickets";

const schema = z.object({
  body: z.string().trim().min(1, { error: "Reply cannot be empty" }),
});

type FormData = z.infer<typeof schema>;

async function createMessage(ticketId: string, data: FormData): Promise<Message> {
  const res = await axios.post<{ message: Message }>(`/api/tickets/${ticketId}/messages`, data, {
    withCredentials: true,
  });
  return res.data.message;
}

interface Props {
  ticket: TicketDetail;
}

export function ReplyForm({ ticket }: Props) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data: FormData) => createMessage(ticket.id.toString(), data),
    onSuccess: (message) => {
      queryClient.setQueryData<TicketDetail>(["ticket", ticket.id.toString()], (old) =>
        old ? { ...old, messages: [...old.messages, message] } : old,
      );
      reset();
    },
    onError: (err) => {
      setError("root", { message: getErrorMessage(err) });
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      className="mt-4 space-y-2 border-t pt-4"
    >
      <Textarea
        aria-label="Reply"
        aria-invalid={!!errors.body}
        placeholder="Write a reply…"
        rows={4}
        {...register("body")}
      />
      {errors.body && <p className="field-error">{errors.body.message}</p>}
      <FormRootError message={errors.root?.message} />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? "Sending…" : "Send Reply"}
        </Button>
      </div>
    </form>
  );
}
