"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { usersRepository } from "@/lib/repositories";
import type { AppUser, Role } from "@/domain/schema/user";

const ROLES: Role[] = ["admin", "accountant", "teacher", "attendance_manager", "viewer"];

export function UsersManager({ users, canManage }: { users: AppUser[]; canManage: boolean }) {
  const { t } = useLocale();
  const { toast } = useToast();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.users}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {users.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t.common.noData}</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p dir="ltr" className="text-xs text-muted-foreground">
                    {u.email}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {canManage ? (
                    <Select
                      value={u.role}
                      onValueChange={async (v) => {
                        await usersRepository.setRole(u.id, v as Role);
                        toast({ title: t.common.successSaved, variant: "success" });
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {t.settings.roles[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="brand">{t.settings.roles[u.role]}</Badge>
                  )}
                  {canManage ? (
                    <label className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={u.isActive}
                        onCheckedChange={async (checked) => {
                          await usersRepository.setActive(u.id, Boolean(checked));
                          toast({ title: t.common.successSaved, variant: "success" });
                        }}
                      />
                      {t.common.active}
                    </label>
                  ) : (
                    <Badge variant={u.isActive ? "success" : "outline"}>{u.isActive ? t.common.active : t.common.inactive}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
