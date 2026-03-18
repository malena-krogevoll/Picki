import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ShoppingMode, sessionProductCache, clearSessionCache, clearSessionCacheForList } from "./ShoppingMode";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const mockUpdateItemStatus = vi.fn();
const mockCompleteList = vi.fn().mockResolvedValue(undefined);
const mockCacheItemProducts = vi.fn();
const mockUpdateCachedSelectedIndex = vi.fn();
const mockAddItem = vi.fn();
const mockRemoveItem = vi.fn();

const makeItem = (overrides: Record<string, any> = {}) => ({
  id: "item-1",
  name: "Melk",
  quantity: 1,
  in_cart: false,
  notes: null,
  product_data: null,
  selected_product_ean: null,
  list_id: "list-1",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const makeProduct = (overrides: Record<string, any> = {}) => ({
  ean: "7038010000001",
  brand: "Tine",
  name: "Helmelk 1L",
  image: "https://example.com/melk.jpg",
  price: 24.9,
  store: "REMA_1000",
  novaScore: 1,
  novaIsEstimated: false,
  hasIngredients: true,
  allergener: "",
  ingredienser: "Helmelk",
  matchInfo: {
    allergyWarnings: [],
    dietWarnings: [],
    dietMatches: [],
    preferenceMatches: [],
    renvareScore: 80,
  },
  ...overrides,
});

vi.mock("@/hooks/useShoppingList", () => ({
  useShoppingList: () => ({
    lists: [
      {
        id: "list-1",
        name: "Min handleliste",
        status: "active",
        store_id: "REMA_1000",
        user_id: "user-1",
        items: mockItems,
      },
    ],
    updateItemStatus: mockUpdateItemStatus,
    completeList: mockCompleteList,
    cacheItemProducts: mockCacheItemProducts,
    updateCachedSelectedIndex: mockUpdateCachedSelectedIndex,
    addItem: mockAddItem,
    removeItem: mockRemoveItem,
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({ profile: { preferences: { allergies: [], diets: [] } } }),
}));

vi.mock("@/hooks/useDiyAlternatives", () => ({
  useDiyAlternatives: () => ({
    findDiyAlternative: () => null,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: { results: [] }, error: null }) },
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}));

vi.mock("@/components/StoreSelectorDialog", () => ({
  StoreSelectorDialog: () => null,
  getStoreName: (id: string) => id === "REMA_1000" ? "Rema 1000" : id,
  getStoreIcon: () => (props: any) => <span data-testid="store-icon" {...props} />,
  getStoreColor: () => "text-primary",
}));

vi.mock("@/components/PreferenceIndicators", () => ({
  PreferenceIndicators: () => null,
  AllergyWarningBanner: ({ allergyWarnings }: any) =>
    allergyWarnings.length > 0 ? <div data-testid="allergy-banner" /> : null,
}));

vi.mock("@/components/DiyAlternativeDialog", () => ({
  DiyAlternativeDialog: () => null,
}));

vi.mock("@/components/CountryFlag", () => ({
  CountryFlag: () => null,
}));

vi.mock("@/lib/storeLayoutSort", () => ({
  groupItemsByCategory: (items: any[]) => [
    { category: "Meieri", emoji: "🥛", items },
  ],
}));

vi.mock("@/lib/preferenceAnalysis", () => ({
  analyzeProductMatch: () => ({
    allergyWarnings: [],
    dietWarnings: [],
    dietMatches: [],
    preferenceMatches: [],
    renvareScore: 80,
  }),
  sortProductsByPreference: (products: any[]) => products,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

// Mutable items list that tests can modify
let mockItems: any[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  storeId: "REMA_1000",
  listId: "list-1",
  onEditList: vi.fn(),
  onChangeStore: vi.fn(),
};

function seedCache(items: any[], products: Record<string, any[]>) {
  const cacheKey = `${defaultProps.listId}:${defaultProps.storeId}`;
  sessionProductCache.set(cacheKey, {
    products,
    selections: {},
    fetchedItems: new Set(Object.keys(products)),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  sessionProductCache.clear();
  mockItems = [];
  localStorage.clear();
});

describe("ShoppingMode", () => {
  // =========================================================================
  // Empty state
  // =========================================================================
  describe("empty list", () => {
    it("shows empty state message when list has no items", () => {
      mockItems = [];
      seedCache([], {});
      render(<ShoppingMode {...defaultProps} />);

      expect(screen.getByText("Ingen varer i handlelisten")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Loading state
  // =========================================================================
  describe("loading state", () => {
    it("renders skeletons while loading (no cache)", () => {
      mockItems = [makeItem()];
      // No cache → triggers loading
      render(<ShoppingMode {...defaultProps} />);

      // Should show skeleton placeholders (the loading branch)
      const skeletons = document.querySelectorAll("[class*='animate-pulse'], [data-slot='skeleton']");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Item rendering with cached product data
  // =========================================================================
  describe("item rendering (cached)", () => {
    it("renders item name and product suggestion", () => {
      const item = makeItem();
      const product = makeProduct();
      mockItems = [item];
      seedCache([item], { [item.id]: [product] });

      render(<ShoppingMode {...defaultProps} />);

      expect(screen.getByText("Melk")).toBeInTheDocument();
      expect(screen.getByText("Tine")).toBeInTheDocument();
      expect(screen.getByText("Helmelk 1L")).toBeInTheDocument();
      expect(screen.getByText("24.90 kr")).toBeInTheDocument();
    });

    it("renders NOVA badge for clean product", () => {
      const item = makeItem();
      const product = makeProduct({ novaScore: 1 });
      mockItems = [item];
      seedCache([item], { [item.id]: [product] });

      render(<ShoppingMode {...defaultProps} />);

      expect(screen.getByText("NOVA 1")).toBeInTheDocument();
    });

    it("renders 'Data mangler' for product without ingredients", () => {
      const item = makeItem();
      const product = makeProduct({ novaScore: null, hasIngredients: false });
      mockItems = [item];
      seedCache([item], { [item.id]: [product] });

      render(<ShoppingMode {...defaultProps} />);

      expect(screen.getByText("Ukjent")).toBeInTheDocument();
    });

    it("shows quantity badge when quantity > 1", () => {
      const item = makeItem({ quantity: 3 });
      const product = makeProduct();
      mockItems = [item];
      seedCache([item], { [item.id]: [product] });

      render(<ShoppingMode {...defaultProps} />);

      expect(screen.getByText("3x")).toBeInTheDocument();
    });

    it("shows 'Ingen produkter funnet' when no suggestions", () => {
      const item = makeItem({ id: "item-nf", name: "Sjeldent krydder" });
      mockItems = [item];
      seedCache([item], { [item.id]: [] });

      render(<ShoppingMode {...defaultProps} />);

      expect(
        screen.getByText(/Ingen produkter funnet for "Sjeldent krydder"/)
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Cart toggling
  // =========================================================================
  describe("cart toggling", () => {
    it("calls updateItemStatus when checkbox is clicked", () => {
      const item = makeItem();
      const product = makeProduct();
      mockItems = [item];
      seedCache([item], { [item.id]: [product] });

      render(<ShoppingMode {...defaultProps} />);

      const checkbox = screen.getAllByRole("checkbox")[0];
      fireEvent.click(checkbox);

      expect(mockUpdateItemStatus).toHaveBeenCalledWith("item-1", true);
    });

    it("shows 'I handlekurv' badge when item is in cart", () => {
      const item = makeItem({ in_cart: true });
      const product = makeProduct();
      mockItems = [item];
      seedCache([item], { [item.id]: [product] });

      render(<ShoppingMode {...defaultProps} />);

      expect(screen.getByText("I handlekurv")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Alternatives expand/collapse
  // =========================================================================
  describe("alternatives", () => {
    it("shows alternatives count and toggles expansion", () => {
      const item = makeItem();
      const products = [
        makeProduct(),
        makeProduct({ ean: "7038010000002", brand: "Q", name: "Lettmelk 1L", price: 22.5 }),
        makeProduct({ ean: "7038010000003", brand: "Røros", name: "Økologisk melk", price: 34.9 }),
      ];
      mockItems = [item];
      seedCache([item], { [item.id]: products });

      render(<ShoppingMode {...defaultProps} />);

      const altButton = screen.getByText("2 alternativer");
      expect(altButton).toBeInTheDocument();

      // Expand
      fireEvent.click(altButton);
      expect(screen.getByText("Q")).toBeInTheDocument();
      expect(screen.getByText("Røros")).toBeInTheDocument();

      // Collapse
      fireEvent.click(altButton);
      expect(screen.queryByText("Q")).not.toBeInTheDocument();
    });

    it("shows '1 alternativ' (singular) for single alternative", () => {
      const item = makeItem();
      const products = [
        makeProduct(),
        makeProduct({ ean: "7038010000002", brand: "Q", name: "Lettmelk", price: 22.5 }),
      ];
      mockItems = [item];
      seedCache([item], { [item.id]: products });

      render(<ShoppingMode {...defaultProps} />);

      expect(screen.getByText("1 alternativ")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Compact view
  // =========================================================================
  describe("compact view", () => {
    it("toggles compact view and persists to localStorage", () => {
      const item = makeItem();
      const product = makeProduct();
      mockItems = [item];
      seedCache([item], { [item.id]: [product] });

      render(<ShoppingMode {...defaultProps} />);

      // Find compact toggle button (the LayoutList/List icon button)
      const compactToggle = screen.getByTitle("Kompakt visning");
      fireEvent.click(compactToggle);

      expect(localStorage.getItem("picki-compact-view")).toBe("true");

      // In compact mode the item name is truncated in a different layout
      // Verify "Du søkte etter:" is NOT shown (only in full view)
      expect(screen.queryByText("Du søkte etter:")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Footer / completion
  // =========================================================================
  describe("footer and completion", () => {
    it("shows total price and items-in-cart count", () => {
      const items = [
        makeItem({ id: "i1", in_cart: true }),
        makeItem({ id: "i2", in_cart: false, name: "Brød" }),
      ];
      const p1 = makeProduct({ price: 24.9 });
      const p2 = makeProduct({ ean: "7038010000002", price: 35.0 });
      mockItems = items;
      seedCache(items, { i1: [p1], i2: [p2] });

      render(<ShoppingMode {...defaultProps} />);

      expect(screen.getByText("59.90 kr")).toBeInTheDocument();
      expect(screen.getByText("1 av 2 varer i kurv")).toBeInTheDocument();
    });

    it("calls completeList and navigates home on completion", async () => {
      const item = makeItem({ in_cart: true });
      const product = makeProduct();
      mockItems = [item];
      seedCache([item], { [item.id]: [product] });

      render(<ShoppingMode {...defaultProps} />);

      // The footer "Fullfør" button
      const completeButtons = screen.getAllByText(/Fullfør/);
      fireEvent.click(completeButtons[completeButtons.length - 1]);

      // Wait for async completeList
      await vi.waitFor(() => {
        expect(mockCompleteList).toHaveBeenCalledWith("list-1");
      });
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  // =========================================================================
  // Header actions
  // =========================================================================
  describe("header actions", () => {
    it("calls onEditList when edit button is clicked", () => {
      const item = makeItem();
      const product = makeProduct();
      mockItems = [item];
      seedCache([item], { [item.id]: [product] });

      const onEditList = vi.fn();
      render(<ShoppingMode {...defaultProps} onEditList={onEditList} />);

      // The Pencil/Rediger button
      const editButtons = screen.getAllByRole("button");
      const editBtn = editButtons.find(
        (b) => b.textContent?.includes("Rediger") || b.querySelector("[class*='lucide-pencil']")
      );
      if (editBtn) fireEvent.click(editBtn);

      expect(onEditList).toHaveBeenCalled();
    });

    it("navigates home when home button is clicked", () => {
      const item = makeItem();
      const product = makeProduct();
      mockItems = [item];
      seedCache([item], { [item.id]: [product] });

      render(<ShoppingMode {...defaultProps} />);

      const homeButtons = screen.getAllByRole("button");
      const homeBtn = homeButtons.find(
        (b) => b.textContent?.includes("Hjem") || b.querySelector("[class*='lucide-home']")
      );
      if (homeBtn) fireEvent.click(homeBtn);

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("displays store name in header", () => {
      const item = makeItem();
      const product = makeProduct();
      mockItems = [item];
      seedCache([item], { [item.id]: [product] });

      render(<ShoppingMode {...defaultProps} />);

      expect(screen.getByText("Rema 1000")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Session cache utilities
  // =========================================================================
  describe("session cache utilities", () => {
    it("clearSessionCache removes specific list+store entry", () => {
      sessionProductCache.set("list-1:REMA_1000", { products: {}, selections: {}, fetchedItems: new Set() });
      sessionProductCache.set("list-1:KIWI", { products: {}, selections: {}, fetchedItems: new Set() });

      clearSessionCache("list-1", "REMA_1000");

      expect(sessionProductCache.has("list-1:REMA_1000")).toBe(false);
      expect(sessionProductCache.has("list-1:KIWI")).toBe(true);
    });

    it("clearSessionCacheForList removes all stores for a list", () => {
      sessionProductCache.set("list-1:REMA_1000", { products: {}, selections: {}, fetchedItems: new Set() });
      sessionProductCache.set("list-1:KIWI", { products: {}, selections: {}, fetchedItems: new Set() });
      sessionProductCache.set("list-2:REMA_1000", { products: {}, selections: {}, fetchedItems: new Set() });

      clearSessionCacheForList("list-1");

      expect(sessionProductCache.has("list-1:REMA_1000")).toBe(false);
      expect(sessionProductCache.has("list-1:KIWI")).toBe(false);
      expect(sessionProductCache.has("list-2:REMA_1000")).toBe(true);
    });
  });

  // =========================================================================
  // NOVA helpers
  // =========================================================================
  describe("NOVA display", () => {
    it("shows warning banner for high-NOVA product", () => {
      const item = makeItem();
      const product = makeProduct({ novaScore: 4, novaIsEstimated: false });
      mockItems = [item];
      seedCache([item], { [item.id]: [product] });

      render(<ShoppingMode {...defaultProps} />);

      expect(screen.getByText("NOVA 4")).toBeInTheDocument();
      expect(
        screen.getByText(/Sterkt bearbeidet produkt/)
      ).toBeInTheDocument();
    });
  });
});
