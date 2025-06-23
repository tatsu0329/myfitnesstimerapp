import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "../../../utils/supabase-server";
import { WorkoutHistoryItem } from "../../../types";

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Retrieve workout history
 *     description: Fetches the list of all workout history items.
 *     responses:
 *       200:
 *         description: A list of workout history items.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WorkoutHistoryItem'
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("history")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      throw error;
    }

    const camelCaseData = data.map((item) => ({
      id: item.id,
      date: item.date,
      bodyPart: item.body_part,
      sets: item.sets,
      totalTime: item.duration || 0,
      createdAt: item.created_at,
    }));

    return NextResponse.json(camelCaseData);
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/history:
 *   post:
 *     summary: Create a new workout history item
 *     description: Adds a new workout session to the history.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WorkoutHistoryItem'
 *     responses:
 *       201:
 *         description: The created workout history item.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkoutHistoryItem'
 *       400:
 *         description: Invalid request body.
 */
export async function POST(req: NextRequest) {
  try {
    // 環境変数の確認
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_KEY
    ) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json(
        {
          message: "Supabase configuration is missing",
          error: "Missing environment variables",
        },
        { status: 500 }
      );
    }

    const { bodyPart, date, sets, totalTime }: WorkoutHistoryItem =
      await req.json();

    console.log("Saving history item:", { bodyPart, date, sets, totalTime });

    const newHistoryItemForDb = {
      date,
      sets,
      duration: Math.round(totalTime),
      body_part: bodyPart,
    };

    const { data, error } = await supabase
      .from("history")
      .insert([newHistoryItemForDb])
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { message: "Failed to create history", error: error.message },
        { status: 500 }
      );
    }

    const result = data.map((item) => ({
      id: item.id,
      date: item.date,
      bodyPart: item.body_part,
      sets: item.sets,
      totalTime: item.duration || 0,
      createdAt: item.created_at,
    }));

    console.log("History saved successfully:", result);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { message: "Error processing request.", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const { error } = await supabase.from("history").delete().neq("id", -1);

    if (error) {
      console.error("Error deleting history:", error);
      throw error;
    }

    return NextResponse.json({ message: "All history deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete history", details: error },
      { status: 500 }
    );
  }
}
