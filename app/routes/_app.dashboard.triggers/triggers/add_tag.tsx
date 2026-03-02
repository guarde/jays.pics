import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

export default function AddTagAction({
  data,
  update,
}: {
  data: any;
  update: (d: any) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Tag name</Label>
      <Input
        placeholder="e.g. screenshot"
        value={data.tag || ""}
        onChange={(e) => update({ tag: e.target.value })}
        className="h-8 text-sm"
      />
      <p className="text-xs text-muted-foreground">
        This tag will be added to every uploaded image.
      </p>
    </div>
  );
}
