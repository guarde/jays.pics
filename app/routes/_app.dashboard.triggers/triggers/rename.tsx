import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

export default function RenameAction({
  data,
  update,
}: {
  data: any;
  update: (d: any) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Display name</Label>
      <Input
        placeholder="e.g. Screenshot {date}"
        value={data.name || ""}
        onChange={(e) => update({ name: e.target.value })}
        className="h-8 text-sm"
      />
      <p className="text-xs text-muted-foreground">
        Overrides the filename for every uploaded image.
      </p>
    </div>
  );
}
