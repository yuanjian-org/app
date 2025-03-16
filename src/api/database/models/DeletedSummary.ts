import {
  Column, Table, Model
} from "sequelize-typescript";
import { TEXT } from "sequelize";

@Table
class DeletedSummary extends Model {
  @Column(TEXT)
  text: string;
}

export default DeletedSummary;
