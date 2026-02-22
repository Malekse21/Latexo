"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/context/user-context";

export default function EmptyStatePage({ title }: { title: string }) {
  const { t } = useUser();
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-center max-w-md mx-auto">
      <div className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-xl font-bold tracking-tight mb-2">{title}</h2>
      <p className="text-muted-foreground text-sm mb-8">
        {t('dashboard.select_report')}
      </p>
      <Link href="/dashboard">
        <Button className="bg-black text-white hover:bg-gray-800 rounded-none h-10 px-6">
          {t('dashboard.go_to_dashboard')}
        </Button>
      </Link>
    </div>
  );
}
