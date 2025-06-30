import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../utils/supabase-server";
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
    // Supabaseが設定されていない場合は空の配列を返す
    if (!supabaseServer) {
      console.warn("Supabase not configured - returning empty history");
      return NextResponse.json([]);
    }

    const { data, error } = await supabaseServer
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
    // Supabaseが設定されていない場合は成功レスポンスを返す（履歴は保存されない）
    if (!supabaseServer) {
      console.warn("Supabase not configured - history will not be saved");
      const { bodyPart, date, sets, totalTime }: WorkoutHistoryItem =
        await req.json();

      console.log("History item would be saved (if Supabase was configured):", {
        bodyPart,
        date,
        sets,
        totalTime,
      });

      return NextResponse.json(
        [
          {
            id: "mock",
            date,
            bodyPart,
            sets,
            totalTime,
            createdAt: new Date().toISOString(),
          },
        ],
        { status: 201 }
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

    const { data, error } = await supabaseServer
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
    // Supabaseが設定されていない場合は成功レスポンスを返す
    if (!supabaseServer) {
      console.warn("Supabase not configured - delete operation skipped");
      return NextResponse.json({ message: "All history deleted successfully" });
    }

    const { error } = await supabaseServer
      .from("history")
      .delete()
      .neq("id", -1);

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
