using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmsBus.Web.Migrations
{
    /// <inheritdoc />
    public partial class MigrateToLongIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Drop all foreign key constraints
            migrationBuilder.Sql("ALTER TABLE `orders` DROP FOREIGN KEY `FK_orders_users_UserId`;");
            migrationBuilder.Sql("ALTER TABLE `orders` DROP FOREIGN KEY `FK_orders_users_AssignedBy`;");
            migrationBuilder.Sql("ALTER TABLE `order_sms` DROP FOREIGN KEY `FK_order_sms_orders_OrderId`;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` DROP FOREIGN KEY `FK_balance_transactions_users_UserId`;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` DROP FOREIGN KEY `FK_balance_transactions_orders_RelatedOrderId`;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` DROP FOREIGN KEY `FK_balance_transactions_users_OperatorId`;");

            // 2. Delete seed data (key type is changing)
            migrationBuilder.DeleteData(
                table: "pricing_config",
                keyColumn: "Id",
                keyValue: 1);

            // 3. Alter all PK columns: int AUTO_INCREMENT → bigint
            migrationBuilder.Sql("ALTER TABLE `users` MODIFY COLUMN `Id` bigint NOT NULL;");
            migrationBuilder.Sql("ALTER TABLE `orders` MODIFY COLUMN `Id` bigint NOT NULL;");
            migrationBuilder.Sql("ALTER TABLE `order_sms` MODIFY COLUMN `Id` bigint NOT NULL;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` MODIFY COLUMN `Id` bigint NOT NULL;");
            migrationBuilder.Sql("ALTER TABLE `pricing_config` MODIFY COLUMN `Id` bigint NOT NULL;");

            // 4. Alter all FK columns: int → bigint
            migrationBuilder.Sql("ALTER TABLE `orders` MODIFY COLUMN `UserId` bigint NULL;");
            migrationBuilder.Sql("ALTER TABLE `orders` MODIFY COLUMN `AssignedBy` bigint NULL;");
            migrationBuilder.Sql("ALTER TABLE `order_sms` MODIFY COLUMN `OrderId` bigint NOT NULL;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` MODIFY COLUMN `UserId` bigint NOT NULL;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` MODIFY COLUMN `RelatedOrderId` bigint NULL;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` MODIFY COLUMN `OperatorId` bigint NULL;");

            // 5. Re-add all foreign key constraints
            migrationBuilder.Sql("ALTER TABLE `orders` ADD CONSTRAINT `FK_orders_users_UserId` FOREIGN KEY (`UserId`) REFERENCES `users` (`Id`) ON DELETE SET NULL;");
            migrationBuilder.Sql("ALTER TABLE `orders` ADD CONSTRAINT `FK_orders_users_AssignedBy` FOREIGN KEY (`AssignedBy`) REFERENCES `users` (`Id`) ON DELETE SET NULL;");
            migrationBuilder.Sql("ALTER TABLE `order_sms` ADD CONSTRAINT `FK_order_sms_orders_OrderId` FOREIGN KEY (`OrderId`) REFERENCES `orders` (`Id`) ON DELETE CASCADE;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` ADD CONSTRAINT `FK_balance_transactions_users_UserId` FOREIGN KEY (`UserId`) REFERENCES `users` (`Id`) ON DELETE CASCADE;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` ADD CONSTRAINT `FK_balance_transactions_orders_RelatedOrderId` FOREIGN KEY (`RelatedOrderId`) REFERENCES `orders` (`Id`) ON DELETE SET NULL;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` ADD CONSTRAINT `FK_balance_transactions_users_OperatorId` FOREIGN KEY (`OperatorId`) REFERENCES `users` (`Id`) ON DELETE SET NULL;");

            // 6. Re-insert seed data with long key
            migrationBuilder.InsertData(
                table: "pricing_config",
                columns: new[] { "Id", "MarkupEnabled", "MarkupPerDay", "UpdatedAt", "UsdCnyRate" },
                values: new object[] { 1L, false, 0m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), 7.25m });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // 1. Drop all foreign key constraints
            migrationBuilder.Sql("ALTER TABLE `orders` DROP FOREIGN KEY `FK_orders_users_UserId`;");
            migrationBuilder.Sql("ALTER TABLE `orders` DROP FOREIGN KEY `FK_orders_users_AssignedBy`;");
            migrationBuilder.Sql("ALTER TABLE `order_sms` DROP FOREIGN KEY `FK_order_sms_orders_OrderId`;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` DROP FOREIGN KEY `FK_balance_transactions_users_UserId`;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` DROP FOREIGN KEY `FK_balance_transactions_orders_RelatedOrderId`;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` DROP FOREIGN KEY `FK_balance_transactions_users_OperatorId`;");

            // 2. Delete seed data
            migrationBuilder.DeleteData(
                table: "pricing_config",
                keyColumn: "Id",
                keyValue: 1L);

            // 3. Revert PK columns: bigint → int AUTO_INCREMENT
            migrationBuilder.Sql("ALTER TABLE `users` MODIFY COLUMN `Id` int NOT NULL AUTO_INCREMENT;");
            migrationBuilder.Sql("ALTER TABLE `orders` MODIFY COLUMN `Id` int NOT NULL AUTO_INCREMENT;");
            migrationBuilder.Sql("ALTER TABLE `order_sms` MODIFY COLUMN `Id` int NOT NULL AUTO_INCREMENT;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` MODIFY COLUMN `Id` int NOT NULL AUTO_INCREMENT;");
            migrationBuilder.Sql("ALTER TABLE `pricing_config` MODIFY COLUMN `Id` int NOT NULL AUTO_INCREMENT;");

            // 4. Revert FK columns: bigint → int
            migrationBuilder.Sql("ALTER TABLE `orders` MODIFY COLUMN `UserId` int NULL;");
            migrationBuilder.Sql("ALTER TABLE `orders` MODIFY COLUMN `AssignedBy` int NULL;");
            migrationBuilder.Sql("ALTER TABLE `order_sms` MODIFY COLUMN `OrderId` int NOT NULL;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` MODIFY COLUMN `UserId` int NOT NULL;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` MODIFY COLUMN `RelatedOrderId` int NULL;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` MODIFY COLUMN `OperatorId` int NULL;");

            // 5. Re-add all foreign key constraints
            migrationBuilder.Sql("ALTER TABLE `orders` ADD CONSTRAINT `FK_orders_users_UserId` FOREIGN KEY (`UserId`) REFERENCES `users` (`Id`) ON DELETE SET NULL;");
            migrationBuilder.Sql("ALTER TABLE `orders` ADD CONSTRAINT `FK_orders_users_AssignedBy` FOREIGN KEY (`AssignedBy`) REFERENCES `users` (`Id`) ON DELETE SET NULL;");
            migrationBuilder.Sql("ALTER TABLE `order_sms` ADD CONSTRAINT `FK_order_sms_orders_OrderId` FOREIGN KEY (`OrderId`) REFERENCES `orders` (`Id`) ON DELETE CASCADE;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` ADD CONSTRAINT `FK_balance_transactions_users_UserId` FOREIGN KEY (`UserId`) REFERENCES `users` (`Id`) ON DELETE CASCADE;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` ADD CONSTRAINT `FK_balance_transactions_orders_RelatedOrderId` FOREIGN KEY (`RelatedOrderId`) REFERENCES `orders` (`Id`) ON DELETE SET NULL;");
            migrationBuilder.Sql("ALTER TABLE `balance_transactions` ADD CONSTRAINT `FK_balance_transactions_users_OperatorId` FOREIGN KEY (`OperatorId`) REFERENCES `users` (`Id`) ON DELETE SET NULL;");

            // 6. Re-insert seed data with int key
            migrationBuilder.InsertData(
                table: "pricing_config",
                columns: new[] { "Id", "MarkupEnabled", "MarkupPerDay", "UpdatedAt", "UsdCnyRate" },
                values: new object[] { 1, false, 0m, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), 7.25m });
        }
    }
}
