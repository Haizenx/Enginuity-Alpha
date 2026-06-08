import mongoose from "mongoose";

const blueprintAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User", // Can be User or SuperAdmin, we use generic ref
    },
    imageUrl: {
      type: String,
      required: true,
    },
    analysis: {
      type: String,
      required: true,
    },
    keywords: {
      type: [String],
      default: [],
    },
    relatedQuestions: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

const BlueprintAnalysis = mongoose.model("BlueprintAnalysis", blueprintAnalysisSchema);

export default BlueprintAnalysis;
