"use client";

import Link from "next/link";
import { CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRepositoryList } from "@/hooks/useRepositoryList";
import { expenseCategoriesRepository, usersRepository } from "@/lib/repositories";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { OrganizationSettingsForm } from "@/components/settings/OrganizationSettingsForm";
import { ExpenseCategoryManager } from "@/components/settings/ExpenseCategoryManager";
import { UsersManager } from "@/components/settings/UsersManager";

export default function SettingsPage() {
  const { t } = useLocale();
  const { can, firebaseReady } = useAuth();
  const { data: categories } = useRepositoryList(expenseCategoriesRepository);
  const { data: users } = useRepositoryList(usersRepository);

  const canWriteSettings = can("settings:write");
  const canManageUsers = can("users:manage");

  return (
    <RequirePermission permission="settings:read">
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />

      <Tabs defaultValue="organization" dir="rtl">
        <TabsList>
          <TabsTrigger value="organization">{t.settings.organization}</TabsTrigger>
          <TabsTrigger value="categories">{t.settings.expenseCategories}</TabsTrigger>
          <TabsTrigger value="users">{t.settings.users}</TabsTrigger>
          <TabsTrigger value="system">{t.settings.firebaseStatus}</TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <OrganizationSettingsForm canWrite={canWriteSettings} />
        </TabsContent>

        <TabsContent value="categories">
          <ExpenseCategoryManager categories={categories} canWrite={canWriteSettings} />
        </TabsContent>

        <TabsContent value="users">
          <UsersManager users={users} canManage={canManageUsers} />
        </TabsContent>

        <TabsContent value="system" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.firebaseStatus}</CardTitle>
            </CardHeader>
            <CardContent>
              {firebaseReady ? (
                <p className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  {t.settings.firebaseConnected}
                </p>
              ) : (
                <div className="flex flex-col gap-2 text-sm text-warning">
                  <p className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {t.settings.firebaseNotConnected}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    .env.local میں فائربیس کی معلومات درج کریں — تفصیل کے لیے docs/SETUP.md دیکھیں۔
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.classes}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/classes" className="flex items-center gap-1 text-sm text-brand hover:underline">
                {t.classes.title}
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </RequirePermission>
  );
}
