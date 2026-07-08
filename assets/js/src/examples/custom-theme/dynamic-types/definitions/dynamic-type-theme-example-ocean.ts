import { injectable } from '@pimcore/studio-ui-bundle/app'
import {
  DynamicTypeThemeAbstract,
  type PimcoreThemeConfig,
  studioThemeIds
} from '@pimcore/studio-ui-bundle/modules/app'

export const exampleOceanThemeId = 'studio-example-ocean'

/**
 * Example "Ocean" token set: a light theme that inherits the studio light base
 * (studio-default-light) and only overrides the brand/interactive colours with
 * a deep-teal ramp chosen to meet WCAG 2.x AAA (7:1 for normal text).
 *
 * All ratios below are measured against #ffffff (the inherited light surface).
 * Note the AAA-specific choice: in a light theme the brand must DARKEN on hover
 * / active, otherwise a lighter hover drops the white button label below 7:1.
 *
 *   colorPrimary        #00595E  8.11:1  (link text on white AND white label on button)
 *   colorPrimaryHover   #004E52  9.50:1
 *   colorPrimaryActive  #003C40 12.21:1
 *   colorAccent         #087881  5.23:1  (>=3:1 UI floor; the base #13a8a8 accent is 2.92:1 and fails)
 *
 * Colours only for now (typography/spacing are inherited from the base). Interaction and
 * region colours are retinted from the base's purple washes to teal; the selected tree row is a
 * light teal band kept a step above the hover (kept light on purpose — the shared label token
 * colorTextTreeElement must stay legible, and a solid dark bar would need a component change,
 * which a token set must never require).
 */
@injectable()
export class DynamicTypeThemeExampleOcean extends DynamicTypeThemeAbstract {
  id: string = exampleOceanThemeId
  extends: string[] = [studioThemeIds.light]

  getThemeConfig (): PimcoreThemeConfig {
    return {
      token: {
        // Brand ramp — darkens on hover/active to keep white-on-brand >= 7:1 (AAA)
        colorPrimary: '#00595E',
        colorPrimaryHover: '#004E52',
        colorPrimaryActive: '#003C40',
        colorPrimaryText: '#00595E',
        colorPrimaryTextHover: '#004E52',
        colorPrimaryTextActive: '#003C40',

        // Links — teal text on the light surface, all AAA
        colorLink: '#00595E',
        colorLinkHover: '#004E52',
        colorLinkActive: '#003C40',

        // Accents / active borders — UI elements (>= 3:1), not text.
        // The base's #00bab3 accent is only 2.42:1 on white (fails even the UI floor); replaced.
        colorAccent: '#087881',
        colorAccentSecondary: '#0B6B73',
        colorBorderActive: '#087881', // 5.23:1
        colorBorderActiveTab: '#00595E', // 8.11:1 — bold brand underline on the active tab
        colorLogo: '#00595E',

        // --- Interaction pass (retint the base's pale-purple washes to teal) ---
        // Tree/menu rows: hover subtle + AAA, selected a bolder teal band. The tree label is
        // colorTextTreeElement (#404655) in BOTH states, so the selected bg is the token-only
        // ceiling that keeps that label legible — a solid dark bar would need a component change,
        // which a token set must never require. Measured against #404655:
        controlItemBgActiveHover: '#DEF1F1', // hover    — 8.07:1 (AAA); light
        controlItemBgActive: '#A7D8D8', // selected — 6.05:1 (AA); a step above hover, not a heavy band
        controlOutline: 'rgba(0, 89, 94, 0.12)', // focus ring — teal, was purple

        // Fills (chips, alternating rows, hover fills) — teal tints, were purple
        colorFill: 'rgba(127, 199, 199, 0.35)',
        colorFillQuaternary: 'rgba(127, 199, 199, 0.22)',
        colorFillActive: '#A7D8D8',
        colorFillAlter: 'rgba(127, 199, 199, 0.22)',
        colorFillNav: 'rgba(0, 89, 94, 0.08)',

        // Tabs: selected text on brand, hover/unselected fills retinted to teal
        itemActiveColor: '#00595E', // 8.11:1
        itemSelectedColor: '#00595E', // 8.11:1
        itemHoverColor: 'rgba(127, 199, 199, 0.45)',
        colorBgUnselectedTab: 'rgba(127, 199, 199, 0.22)',
        colorBgHoverUnselectedTab: 'rgba(127, 199, 199, 0.40)',

        // --- Brave region backgrounds (the color reaches the chrome, not just states) ---
        colorBgToolbar: '#EAF6F6',
        colorBgSidebarOptions: '#EAF6F6',
        colorBgMainNavColumn: 'rgba(0, 89, 94, 0.05)',
        colorBgFieldset: '#F2FBFB',
        colorBorderFieldset: '#CFE6E6',

        // --- Remaining purple accents retinted (icons, borders, sidebar, info) ---
        colorIconSecondary: '#3E5C5C', // 7.27:1  (was #4d4169 purple-slate)
        colorIconSidebar: '#06363A', // 13.15:1 (was #22075e deep purple)
        itemUnselectedIconColor: '#3E5C5C', // 7.27:1  (was #4d4169)
        colorTextSidebarTitle: '#00595E', // 8.11:1  (was #531dab)
        colorBorderTertiary: '#E1EAEA', // teal-grey (was #eae8ed purple-grey)
        colorBorderContainer: '#E1EAEA',
        colorBorderPanelTitle: '#A7D8D8', // panel-title separator (was #d3adf7)
        colorInfoBorderHover: '#4FB3BA', // info hover border (was #b37feb)
        colorFillAdditional: '#EAF6F6', // (was #f5f3fa purple-grey)

        // Boot palette — seeds the loading screen via resolveTokenDefaults
        // (colorPrimary + colorBgCanvas + colorBgLogoOrbit; colorBgContainer inherited)
        colorBgCanvas: '#F4FAF9',
        colorBgLogoOrbit: 'rgba(0, 89, 94, 0.12)'
      },

      // The base sets purple PER COMPONENT, and component tokens beat the global `token` map.
      // The chain deep-merges (lodash mergeWith), so overriding just these keys retints the
      // remaining purple hovers/active states while keeping every untouched base setting.
      components: {
        // Grid/table selected + active row — was #f8eeff (purple)
        Table: {
          controlItemBgActive: '#A7D8D8'
        },
        // Tabs — hover fills to teal, active text + ink bar to brand (were purple #531dab / purple washes)
        Tabs: {
          itemActiveColor: '#00595E',
          itemSelectedColor: '#00595E',
          inkBarColor: '#00595E',
          colorBorderActiveTab: '#00595E',
          itemHoverColor: 'rgba(127, 199, 199, 0.45)',
          colorBgUnselectedTab: 'rgba(127, 199, 199, 0.22)',
          colorBgHoverUnselectedTab: 'rgba(127, 199, 199, 0.40)',
          itemUnselectedIconColor: '#3E5C5C',
          colorBorderContainer: '#E1EAEA'
        },
        // Tags — interactive purples + info tint
        Tag: {
          colorPrimary: '#087881',
          colorPrimaryHover: '#004E52',
          colorPrimaryActive: '#003C40',
          colorFillQuaternary: 'rgba(127, 199, 199, 0.22)',
          colorInfoBg: '#E6F4F4',
          colorInfoBorder: '#A7D8D8'
        },
        // Pagination active page — was #531dab
        Pagination: {
          colorPrimary: '#00595E'
        },
        // Tree heading + border — were #531dab / #eae8ed (colorTextTree label stays)
        Tree: {
          colorBorderTree: '#E1EAEA',
          colorPrimaryHeading: '#00595E'
        },
        // Divider split — was #d3adf7
        Divider: {
          colorSplit: '#CFE6E6'
        },
        // Default / ghost buttons — border + text were purple
        Button: {
          defaultBorderColor: '#A7D8D8',
          defaultColor: '#00595E',
          defaultGhostColor: '#00595E'
        },
        // Breadcrumb current item — was #531dab
        Breadcrumb: {
          lastItemColor: '#00595E'
        },
        // Avatar user indicator — was #722ed1
        Avatar: {
          colorUserIndicator: '#00595E'
        },
        // Alert info variant — brand is teal now, not purple
        Alert: {
          colorInfo: '#087881',
          colorInfoBg: '#E6F4F4',
          colorInfoBorder: '#A7D8D8'
        },
        Colors: {
          // Generic neutral hover fill used across components — was purple
          Neutral: {
            Fill: {
              colorFill: 'rgba(127, 199, 199, 0.35)'
            }
          },
          // Brand primary text token — was deep purple #22075e
          Brand: {
            Primary: {
              colorPrimaryText: '#003C40'
            }
          }
        }
      }
    }
  }
}
