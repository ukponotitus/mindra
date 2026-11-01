import { Menu } from "@base-ui/react/menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { THEME_CHOICES, useTheme, type ThemeChoice } from "../lib/theme";

const icons = { light: Sun, dark: Moon, system: Monitor };

/** Light, dark or the device's setting, as choices inside an account menu. */
export default function ThemeMenuItems({ itemClass }: { itemClass: string }) {
  const { choice, setTheme } = useTheme();
  return (
    <Menu.Group>
      <Menu.GroupLabel className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">Appearance</Menu.GroupLabel>
      <Menu.RadioGroup value={choice} onValueChange={(value) => setTheme(value as ThemeChoice)}>
        {THEME_CHOICES.map(({ id, label }) => {
          const Icon = icons[id];
          return (
            <Menu.RadioItem key={id} value={id} closeOnClick={false} className={itemClass}>
              <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
              <span className="flex-1">{label}</span>
              <Menu.RadioItemIndicator>
                <Check aria-hidden="true" className="size-4 text-primary" />
              </Menu.RadioItemIndicator>
            </Menu.RadioItem>
          );
        })}
      </Menu.RadioGroup>
    </Menu.Group>
  );
}
