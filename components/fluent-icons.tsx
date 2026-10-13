"use client";
import { forwardRef, type ComponentType, type SVGProps } from "react";
import {
  Add20Regular,
  ArrowClockwise20Regular,
  ArrowCounterclockwise20Regular,
  ArrowDown20Regular,
  ArrowLeft20Regular,
  ArrowRedo20Regular,
  ArrowReply20Regular,
  ArrowRight20Regular,
  ArrowUndo20Regular,
  ArrowUpRight20Regular,
  ArrowUpload20Regular,
  BookOpen20Regular,
  BrainCircuit20Regular,
  BranchCompare20Regular,
  Calendar20Regular,
  Chat20Regular,
  Checkmark20Regular,
  CheckmarkCircle20Regular,
  ChevronDown20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  ChevronUp20Regular,
  Circle20Regular,
  Clock20Regular,
  Code20Regular,
  Compose20Regular,
  Copy20Regular,
  Delete20Regular,
  Dismiss20Regular,
  DismissCircle20Regular,
  DocumentText20Regular,
  Edit20Regular,
  ErrorCircle20Regular,
  Folder20Regular,
  FolderArrowUp20Regular,
  FolderOpen20Regular,
  FullScreenMaximize20Regular,
  HardDrive20Regular,
  HatGraduation20Regular,
  History20Regular,
  Home20Regular,
  Image20Regular,
  Info20Regular,
  Keyboard20Regular,
  Layer20Regular,
  Link20Regular,
  MoreHorizontal20Regular,
  Organization20Regular,
  PanelLeft20Regular,
  Play20Regular,
  QuestionCircle20Regular,
  ReOrderDotsVertical20Regular,
  Search20Regular,
  Send20Regular,
  Settings20Regular,
  SignOut20Regular,
  Sparkle20Regular,
  SpinnerIos20Regular,
  Star20Regular,
  Subtract20Regular,
  TextWrap20Regular,
  Warning20Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
  ZoomIn20Regular,
  ZoomOut20Regular,
} from "@fluentui/react-icons";
// One icon family, with a small adapter for the existing size API.
type Props = SVGProps<SVGSVGElement> & {
  size?: number | string;
  strokeWidth?: number | string;
};
function icon(Glyph: ComponentType<SVGProps<SVGSVGElement>>) {
  return forwardRef<SVGSVGElement, Props>(function FluentIcon(
    { size = 20, style, strokeWidth, ...props },
    ref,
  ) {
    void strokeWidth; // Fluent glyphs have fixed geometry.
    return (
      <Glyph
        {...props}
        ref={ref}
        aria-hidden={props["aria-label"] ? undefined : true}
        style={{ width: size, height: size, flexShrink: 0, ...style }}
      />
    );
  });
}
export const AlertCircle = icon(ErrorCircle20Regular);
export const ArrowDownIcon = icon(ArrowDown20Regular);
export const ArrowLeft = icon(ArrowLeft20Regular);
export const ArrowRight = icon(ArrowRight20Regular);
export const ArrowUpRight = icon(ArrowUpRight20Regular);
export const BookOpen = icon(BookOpen20Regular);
export const Brain = icon(BrainCircuit20Regular);
export const Calendar = icon(Calendar20Regular);
export const Check = icon(Checkmark20Regular);
export const CheckCircle2 = icon(CheckmarkCircle20Regular);
export const CheckIcon = icon(Checkmark20Regular);
export const ChevronDown = icon(ChevronDown20Regular);
export const ChevronDownIcon = icon(ChevronDown20Regular);
export const ChevronLeftIcon = icon(ChevronLeft20Regular);
export const ChevronRight = icon(ChevronRight20Regular);
export const ChevronRightIcon = icon(ChevronRight20Regular);
export const ChevronUp = icon(ChevronUp20Regular);
export const ChevronUpIcon = icon(ChevronUp20Regular);
export const CircleCheckIcon = icon(CheckmarkCircle20Regular);
export const CircleIcon = icon(Circle20Regular);
export const Clock = icon(Clock20Regular);
export const Code2 = icon(Code20Regular);
export const Command = icon(Keyboard20Regular);
export const Copy = icon(Copy20Regular);
export const CornerDownRight = icon(ArrowReply20Regular);
export const FileText = icon(DocumentText20Regular);
export const Folder = icon(Folder20Regular);
export const FolderOpen = icon(FolderOpen20Regular);
export const FolderUp = icon(FolderArrowUp20Regular);
export const GitCompare = icon(BranchCompare20Regular);
export const GraduationCap = icon(HatGraduation20Regular);
export const GripVertical = icon(ReOrderDotsVertical20Regular);
export const GripVerticalIcon = icon(ReOrderDotsVertical20Regular);
export const HardDrive = icon(HardDrive20Regular);
export const HelpCircle = icon(QuestionCircle20Regular);
export const History = icon(History20Regular);
export const Home = icon(Home20Regular);
export const Image = icon(Image20Regular);
export const InfoIcon = icon(Info20Regular);
export const Layers = icon(Layer20Regular);
export const Link2 = icon(Link20Regular);
export const Loader2 = icon(SpinnerIos20Regular);
export const Loader2Icon = icon(SpinnerIos20Regular);
export const LogOut = icon(SignOut20Regular);
export const Maximize = icon(FullScreenMaximize20Regular);
export const MessageSquare = icon(Chat20Regular);
export const Minus = icon(Subtract20Regular);
export const MinusIcon = icon(Subtract20Regular);
export const Moon = icon(WeatherMoon20Regular);
export const MoreHorizontal = icon(MoreHorizontal20Regular);
export const MoreHorizontalIcon = icon(MoreHorizontal20Regular);
export const Network = icon(Organization20Regular);
export const OctagonXIcon = icon(DismissCircle20Regular);
export const PanelLeft = icon(PanelLeft20Regular);
export const PanelLeftIcon = icon(PanelLeft20Regular);
export const PenLine = icon(Edit20Regular);
export const Play = icon(Play20Regular);
export const Plus = icon(Add20Regular);
export const Redo2 = icon(ArrowRedo20Regular);
export const RefreshCw = icon(ArrowClockwise20Regular);
export const RotateCcw = icon(ArrowCounterclockwise20Regular);
export const RotateCw = icon(ArrowClockwise20Regular);
export const Search = icon(Search20Regular);
export const SearchIcon = icon(Search20Regular);
export const Send = icon(Send20Regular);
export const Settings = icon(Settings20Regular);
export const Sparkles = icon(Sparkle20Regular);
export const SquarePen = icon(Compose20Regular);
export const Star = icon(Star20Regular);
export const Sun = icon(WeatherSunny20Regular);
export const Trash2 = icon(Delete20Regular);
export const TriangleAlertIcon = icon(Warning20Regular);
export const Undo2 = icon(ArrowUndo20Regular);
export const Upload = icon(ArrowUpload20Regular);
export const WrapText = icon(TextWrap20Regular);
export const X = icon(Dismiss20Regular);
export const XIcon = icon(Dismiss20Regular);
export const ZoomIn = icon(ZoomIn20Regular);
export const ZoomOut = icon(ZoomOut20Regular);
