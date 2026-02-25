"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { formatDate } from "@/lib/utils";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function TransactionHistory() {
  const { data: transactions, isLoading } = api.project.getTransactionHistory.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        No transactions yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => (
        <Card
          key={transaction.id}
          className={`p-4 flex items-center justify-between border-l-4 ${
            transaction.type === "PURCHASE"
              ? "border-l-green-500 bg-green-50 dark:bg-green-950/20"
              : "border-l-red-500 bg-red-50 dark:bg-red-950/20"
          }`}
        >
          <div className="flex items-center gap-3 flex-1">
            <div
              className={`p-2 rounded-lg ${
                transaction.type === "PURCHASE"
                  ? "bg-green-100 dark:bg-green-900/40"
                  : "bg-red-100 dark:bg-red-900/40"
              }`}
            >
              {transaction.type === "PURCHASE" ? (
                <ArrowDownLeft className={`w-5 h-5 text-green-600 dark:text-green-400`} />
              ) : (
                <ArrowUpRight className={`w-5 h-5 text-red-600 dark:text-red-400`} />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {transaction.description}
              </p>
              {transaction.projectName && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Project: <span className="font-medium">{transaction.projectName}</span>
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {formatDate(transaction.date)}
              </p>
            </div>
          </div>
          <div
            className={`font-semibold text-lg min-w-fit ml-4 ${
              transaction.type === "PURCHASE"
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {transaction.type === "PURCHASE" ? "+" : "-"}
            {transaction.amount}
          </div>
        </Card>
      ))}
    </div>
  );
}

