import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createCompanyAdmin, listCompanies, saveCompany, setCompanyActive } from "./master.functions";

export function useMasterCompanies() {
  return useQuery({
    queryKey: ["master-companies"],
    queryFn: () => listCompanies(),
  });
}

function useInvalidateCompanies() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["master-companies"] });
    void queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };
}

export type CompanyInput = {
  id?: string | undefined;
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  isActive: boolean;
  logoFile?: File | null;
};

async function encodeLogo(file: File) {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return {
    base64: btoa(binary),
    contentType: file.type || "image/png",
    extension: (file.name.split(".").pop() ?? "png").toLowerCase().slice(0, 5),
  };
}

export function useSaveCompany() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: async (input: CompanyInput) => {
      if (input.logoFile && input.logoFile.size > 2_000_000) {
        throw new Error("A logo deve ter no máximo 2 MB.");
      }
      const logo = input.logoFile ? await encodeLogo(input.logoFile) : null;
      return saveCompany({
        data: {
          ...(input.id ? { id: input.id } : {}),
          name: input.name,
          slug: input.slug,
          primaryColor: input.primaryColor,
          secondaryColor: input.secondaryColor,
          isActive: input.isActive,
          logo,
        },
      });
    },
    onSuccess: invalidate,
  });
}

export function useToggleCompanyActive() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) => setCompanyActive({ data: input }),
    onSuccess: invalidate,
  });
}

export function useCreateCompanyAdmin() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: (input: {
      companyId: string;
      fullName: string;
      email: string;
      password: string;
    }) => createCompanyAdmin({ data: input }),
    onSuccess: invalidate,
  });
}
