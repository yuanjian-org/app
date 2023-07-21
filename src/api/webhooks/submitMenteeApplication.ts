import { procedure } from "../trpc";
import z from "zod";

export default procedure
  .input(z.record(z.string(), z.any()))
  .mutation(async ({ input }) => 
{
  console.log('not implemented', input);
});
