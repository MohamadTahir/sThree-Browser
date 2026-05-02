import z from "zod";
import { Group } from "@/models/types";

export const GroupFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().min(1, "Color is required"),
});

export type GroupFormData = z.infer<typeof GroupFormSchema>;

export const DefaultGroupFormData: GroupFormData = {
  name: "",
  color: "#3b82f6",
};

export type GroupModalState = {
  open: boolean;
  group: Group | null;
};

export const DefaultGroupModalState: GroupModalState = {
  open: false,
  group: null,
};
