"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/authentication/actions";
import { useTranslation } from "@/lib/i18n/use-translation";

interface LogoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoutConfirmDialog({
  open,
  onOpenChange,
}: LogoutConfirmDialogProps) {
  const { isEn } = useTranslation();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("sonar_user_cache");
        }
      } catch {
        // Ignore storage errors
      }
      await signOutAction();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0">
            <LogOut className="size-6" aria-hidden="true" />
          </div>
          <DialogTitle className="text-lg font-bold">
            {isEn ? "Sign out of SONAR?" : "Konfirmasi Keluar dari SONAR"}
          </DialogTitle>
          <DialogDescription>
            {isEn
              ? "Are you sure you want to sign out? You will need to sign in again to access your materials, courses, and reading history."
              : "Apakah Anda yakin ingin keluar dari akun? Anda perlu masuk kembali untuk mengakses materi kuliah, riwayat bacaan, dan pengaturan Anda."}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              className="rounded-xl font-ui"
            >
              {isEn ? "Cancel" : "Batal"}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleLogout}
            className="rounded-xl font-ui"
          >
            <LogOut className="mr-1.5 size-4" aria-hidden="true" />
            <span>{isPending ? (isEn ? "Signing out..." : "Sedang keluar...") : (isEn ? "Sign out" : "Ya, Keluar")}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
