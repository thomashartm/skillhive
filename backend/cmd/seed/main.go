package main

import (
	"context"
	"log/slog"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/thomas/skillhive-api/internal/config"
	"github.com/thomas/skillhive-api/internal/store"
	"github.com/thomas/skillhive-api/internal/validate"
)

type seedDiscipline struct {
	Name        string
	Slug        string
	Description string
}

type seedCategory struct {
	Name        string
	Description string
	Children    []seedCategory
}

type seedTechnique struct {
	Name          string
	Slug          string
	Description   string
	CategorySlugs []string
	TagSlugs      []string
}

type seedTag struct {
	Name        string
	Description string
}

func main() {
	cfg := config.Load()
	ctx := context.Background()

	clients, err := store.NewFirebaseClients(ctx, cfg.GCPProject, cfg.FirebaseKeyPath)
	if err != nil {
		slog.Error("failed to initialize Firebase", "error", err)
		os.Exit(1)
	}
	defer clients.Close()

	fs := clients.Firestore

	// Bootstrap admin if ADMIN_EMAIL is set
	if adminEmail := os.Getenv("ADMIN_EMAIL"); adminEmail != "" {
		bootstrapAdmin(ctx, clients, adminEmail)
	}

	// Seed disciplines
	disciplines := []seedDiscipline{
		{
			Name:        "Brazilian Jiu-Jitsu",
			Slug:        "bjj",
			Description: "Brazilian Jiu-Jitsu (BJJ) is a martial art and combat sport based on grappling, ground fighting, and submission holds.",
		},
		{
			Name:        "Jeet Kune Do",
			Slug:        "jkd",
			Description: "Jeet Kune Do (JKD) is a hybrid martial art philosophy and fighting system developed by Bruce Lee.",
		},
	}

	for _, d := range disciplines {
		seedDisciplineDoc(ctx, fs, d)
	}

	// Seed BJJ categories (hierarchical)
	bjjCategories := []seedCategory{
		{Name: "Closing the Distance", Description: "Techniques for approaching and entering grappling range, including footwork, level changes, and clinch entries"},
		{Name: "Takedown", Description: "Standing grappling techniques to bring an opponent to the ground, including single legs, double legs, throws, and trips"},
		{
			Name:        "Guard",
			Description: "Bottom positions where the guard player uses their legs to control, sweep, or submit an opponent",
			Children: []seedCategory{
				{
					Name:        "Closed Guard",
					Description: "Full guard with ankles locked behind the opponent's back, providing strong control and many attack options",
					Children: []seedCategory{
						{Name: "Rubber Guard", Description: "A flexible closed guard variation using an overhook on your own shin to control posture and set up submissions"},
					},
				},
				{Name: "Butterfly Guard", Description: "Open guard using double underhooks with feet as hooks on the opponent's inner thighs for sweeps and elevation"},
				{Name: "Spider Guard", Description: "Gi-based open guard using sleeve grips with feet on the opponent's biceps to control distance and set up sweeps"},
				{Name: "De La Riva", Description: "Open guard wrapping one leg around the opponent's lead leg from the outside, using the foot as a hook on the far hip"},
				{Name: "Reverse De La Riva", Description: "Open guard hooking the opponent's lead leg from the inside, often used to take the back or transition to other guards"},
				{Name: "X-Guard", Description: "Guard position underneath the opponent with legs forming an X-shape around one leg, creating powerful off-balancing sweeps"},
				{Name: "Single Leg X (SLX)", Description: "Guard controlling one of the opponent's legs with both legs in a figure-four configuration, a key entry to leg attacks"},
				{Name: "Lasso Guard", Description: "Gi-based guard wrapping your leg around the opponent's arm while controlling the sleeve, restricting their passing ability"},
				{Name: "Worm Guard", Description: "Lapel-based guard threading the opponent's gi lapel around their leg and gripping it to create a strong anchor point"},
				{Name: "50/50 Guard", Description: "Symmetrical leg entanglement where both players have equal leg control, common in both sweeping exchanges and heel hook battles"},
			},
		},
		{
			Name:        "Half-Guard",
			Description: "Bottom position trapping one of the opponent's legs between yours, offering a balance of offense and defense",
			Children: []seedCategory{
				{Name: "Deep Half Guard", Description: "Half guard variation where you go deep underneath the opponent, controlling their trapped leg near the hip for sweeps"},
				{Name: "Z-Guard", Description: "Half guard with a knee shield (shin frame) across the opponent's torso, creating distance and framing opportunities"},
				{Name: "Lockdown", Description: "Half guard control using a double leg grapevine on the opponent's trapped leg, restricting their movement and enabling whip-up sweeps"},
			},
		},
		{
			Name:        "Side Control",
			Description: "Dominant top position perpendicular to the opponent's body, providing heavy pressure and access to submissions",
			Children: []seedCategory{
				{Name: "Cross-Face Side Control", Description: "Standard side control with a cross-face grip controlling the opponent's head, maximizing chest-to-chest pressure"},
				{Name: "Reverse Kesa Gatame", Description: "Side control variation facing the opponent's legs with an underhook, providing strong hip control and access to arm attacks"},
				{Name: "Kesa Gatame", Description: "Scarf hold position with head control and an arm trapped, a judo-derived pin offering shoulder locks and chokes"},
			},
		},
		{Name: "Knee on Belly", Description: "Dominant position with one knee on the opponent's stomach or chest, creating pressure and mobility for transitions and submissions"},
		{
			Name:        "Mount",
			Description: "Top position sitting on the opponent's torso, one of the most dominant positions in grappling",
			Children: []seedCategory{
				{Name: "High Mount", Description: "Mount with knees high in the opponent's armpits, maximizing control and access to collar chokes and armbars"},
				{Name: "Low Mount", Description: "Mount sitting low on the opponent's hips, providing a stable base and grapevine control of the legs"},
				{Name: "S-Mount", Description: "Asymmetric mount with one leg posted high near the head and the other tucked, setting up armbars and triangles"},
				{Name: "Technical Mount", Description: "Modified mount with one hook in and one knee up, used to transition to the back or maintain control against escapes"},
			},
		},
		{
			Name:        "Back",
			Description: "Rear control position behind the opponent, providing access to chokes and the highest point-scoring position",
			Children: []seedCategory{
				{Name: "Rear Mount with Body Triangle", Description: "Back control using a figure-four leg lock around the opponent's torso instead of hooks, providing crushing pressure and control"},
				{Name: "Turtle Back Take", Description: "Techniques for transitioning from the turtle position to full back control with hooks or body triangle"},
			},
		},
		{Name: "North-South", Description: "Top position with chest-to-chest contact while facing opposite directions, used for pins, kimuras, and chokes"},
		{Name: "Seminar", Description: "Full seminar recordings covering multiple techniques, concepts, and Q&A sessions from experienced practitioners"},
		{
			Name:        "Transitional Positions",
			Description: "Positions that occur during scrambles and transitions between major positions",
			Children: []seedCategory{
				{Name: "Turtle", Description: "Defensive position on all fours protecting the neck and arms, used to prevent guard passes and stall opponents"},
				{Name: "Front Headlock", Description: "Controlling the opponent's head and arm from the front while they are bent over, a hub position for guillotines, darces, and anacondas"},
				{Name: "Crucifix", Description: "Pinning position trapping both of the opponent's arms using your legs and arms, exposing the neck for chokes and strikes"},
				{Name: "Truck", Description: "A lateral back control position using a lockdown-style leg entanglement, allowing calf slicers, twisting back takes, and submissions"},
				{Name: "Stack", Description: "Position where the top player drives the bottom player's hips over their head, compressing them to pass guard or finish submissions"},
			},
		},
		{
			Name:        "Leg Entanglements",
			Description: "Lower body control positions used primarily for leg lock attacks and sweeps",
			Children: []seedCategory{
				{Name: "Ashi Garami", Description: "Standard leg entanglement controlling the opponent's leg with inside position, the basic platform for straight ankle locks and toe holds"},
				{Name: "Outside Ashi", Description: "Leg entanglement with your legs on the outside of the opponent's trapped leg, providing better heel hook angles and finishing mechanics"},
				{Name: "Inside Sankaku", Description: "Leg entanglement using a triangle (sankaku) lock around the opponent's leg from the inside, creating powerful heel hook control"},
			},
		},
		{
			Name:        "Upper Body Locks",
			Description: "Submissions targeting the shoulder, elbow, and wrist — the most common attacks from Guard, Mount, and Side Control",
			Children: []seedCategory{
				{Name: "Elbow Locks", Description: "Joint locks that hyperextend the elbow joint, including armbars and straight armlocks"},
				{Name: "Shoulder Locks", Description: "Joint locks that force rotation of the shoulder joint, including americanas, kimuras, and omoplatas"},
				{Name: "Wrist Locks", Description: "Joint locks that compress or rotate the wrist joint, often used as surprise attacks from almost any position"},
			},
		},
		{
			Name:        "Lower Body Locks",
			Description: "Submissions targeting the hip, knee, ankle, and foot — a rapidly evolving area of modern BJJ, especially in No-Gi",
			Children: []seedCategory{
				{Name: "Straight Locks", Description: "Leg submissions that hyperextend a joint, including kneebars and straight ankle locks"},
				{Name: "Rotational Locks", Description: "Leg submissions that apply torque to twist a joint, including heel hooks and toe holds"},
				{Name: "Hip Locks", Description: "Submissions attacking the hip and groin by stretching the legs apart, such as the banana split from the truck position"},
			},
		},
		{
			Name:        "Spinal Locks",
			Description: "Submissions attacking the spine and neck — many illegal in IBJJF below Black Belt but common in ADCC, MMA, and Catch Wrestling",
			Children: []seedCategory{
				{Name: "Cervical Cranks", Description: "Neck attacks that force the chin to the chest or twist the neck, including can openers and neck cranks"},
				{Name: "Spinal Twists", Description: "Attacks that force lateral rotation of the spine and neck, such as the twister"},
			},
		},
		{
			Name:        "Compression Locks",
			Description: "Submissions that compress a muscle group against a bone or fulcrum to cause pain or separate a joint, using a limb as a wedge",
		},
	}

	for _, c := range bjjCategories {
		seedCategoryDoc(ctx, fs, "bjj", c, nil)
	}

	// Seed BJJ tags (lock mechanics)
	bjjTags := []seedTag{
		{Name: "Hyperextension", Description: "Bending a joint backward against its natural range of motion (e.g., Armbar, Kneebar)"},
		{Name: "Rotation", Description: "Twisting a joint to force torsion (e.g., Kimura, Heel Hook)"},
		{Name: "Compression", Description: "Crushing tissue against a bone or fulcrum (e.g., Bicep Slicer, Calf Slicer)"},
	}

	for _, t := range bjjTags {
		seedTagDoc(ctx, fs, "bjj", t)
	}

	// Seed BJJ techniques
	bjjTechniques := []seedTechnique{
		// Original seeded techniques
		{Name: "Scissor Sweep", Description: "Basic closed guard sweep using a scissoring motion of the legs to off-balance and reverse the opponent", CategorySlugs: []string{"guard", "closed-guard"}},
		{Name: "Hip Bump Sweep", Description: "Closed guard sweep using explosive hip elevation to off-balance the opponent and come up to mount", CategorySlugs: []string{"guard", "closed-guard"}},
		{Name: "Armbar from Guard", Description: "Armbar submission attacking the elbow joint from the closed guard position by controlling the arm and pivoting the hips", CategorySlugs: []string{"guard", "closed-guard", "elbow-locks"}, TagSlugs: []string{"hyperextension"}},
		{Name: "Triangle Choke", Description: "Blood choke using the legs in a figure-four around the opponent's head and one arm, cutting off blood flow to the brain", CategorySlugs: []string{"guard", "closed-guard"}},
		{Name: "Rear Naked Choke", Description: "The highest-percentage submission in grappling, a blood choke applied from back control by encircling the neck with the arms", CategorySlugs: []string{"back"}},
		{Name: "Americana", Description: "A shoulder lock that forces external rotation of the shoulder using a figure-four grip on the bent arm, typically from mount or side control", CategorySlugs: []string{"mount", "side-control", "shoulder-locks"}, TagSlugs: []string{"rotation"}},
		{Name: "Cross Collar Choke", Description: "A gi-based blood choke from mount using cross-grips on the opponent's collar to apply pressure to both carotid arteries", CategorySlugs: []string{"mount"}},
		{Name: "Side Control Escape (Shrimp)", Description: "Fundamental escape using the hip escape (shrimp) movement to create space and recover guard from side control", CategorySlugs: []string{"side-control"}},
		{Name: "Single Leg Takedown", Description: "A fundamental wrestling takedown securing one of the opponent's legs and driving through to take them down", CategorySlugs: []string{"takedown"}},
		{Name: "Double Leg Takedown", Description: "A fundamental wrestling takedown shooting in to secure both of the opponent's legs and driving them to the ground", CategorySlugs: []string{"takedown"}},

		// Upper body lock techniques
		{Name: "Armbar", Description: "A joint lock that hyperextends the elbow by isolating the arm and applying downward pressure against the hips as a fulcrum", CategorySlugs: []string{"elbow-locks", "upper-body-locks"}, TagSlugs: []string{"hyperextension"}},
		{Name: "Straight Armlock", Description: "An elbow lock attacking the extended arm from a standing position or while passing guard, hyperextending the elbow joint", CategorySlugs: []string{"elbow-locks", "upper-body-locks"}, TagSlugs: []string{"hyperextension"}},
		{Name: "Kimura", Description: "A shoulder lock that forces internal rotation by controlling the bent arm behind the opponent's back using a figure-four grip", CategorySlugs: []string{"shoulder-locks", "upper-body-locks"}, TagSlugs: []string{"rotation"}},
		{Name: "Omoplata", Description: "A shoulder lock using the legs to trap and control the opponent's arm, forcing internal rotation of the shoulder joint", CategorySlugs: []string{"shoulder-locks", "upper-body-locks", "guard"}, TagSlugs: []string{"rotation"}},
		{Name: "Wrist Lock", Description: "A joint lock that hyperextends or rotates the wrist joint, often used as a surprise submission from almost any position", CategorySlugs: []string{"wrist-locks", "upper-body-locks"}, TagSlugs: []string{"rotation"}},

		// Lower body lock techniques
		{Name: "Kneebar", Description: "A leg lock that hyperextends the knee joint, mechanically similar to an armbar but applied to the leg", CategorySlugs: []string{"straight-locks", "lower-body-locks", "leg-entanglements"}, TagSlugs: []string{"hyperextension"}},
		{Name: "Straight Ankle Lock", Description: "A fundamental leg lock that hyperextends the ankle/foot by applying pressure against the Achilles tendon", CategorySlugs: []string{"straight-locks", "lower-body-locks", "leg-entanglements"}, TagSlugs: []string{"hyperextension"}},
		{Name: "Heel Hook", Description: "A devastating leg lock that twists the heel to force rotation in the knee ligaments, with inside and outside variations", CategorySlugs: []string{"rotational-locks", "lower-body-locks", "leg-entanglements"}, TagSlugs: []string{"rotation"}},
		{Name: "Toe Hold", Description: "A foot lock that twists the foot to torque the ankle and knee joints using a kimura-style figure-four grip on the foot", CategorySlugs: []string{"rotational-locks", "lower-body-locks", "leg-entanglements"}, TagSlugs: []string{"rotation"}},
		{Name: "Banana Split", Description: "A submission that stretches the legs apart to attack the hips and groin, typically applied from the truck position", CategorySlugs: []string{"hip-locks", "lower-body-locks"}},

		// Spinal lock techniques
		{Name: "Can Opener", Description: "A cervical crank that forces the chin to the chest by clasping the hands behind the opponent's head and pulling down from inside their guard", CategorySlugs: []string{"cervical-cranks", "spinal-locks"}},
		{Name: "Twister", Description: "A spinal lock that forces lateral rotation of the spine and neck, typically set up from the truck position with a leg entanglement", CategorySlugs: []string{"spinal-twists", "spinal-locks"}},

		// Compression lock techniques
		{Name: "Bicep Slicer", Description: "A compression lock that crushes the forearm into the bicep using a shin or forearm as a wedge across the elbow joint", CategorySlugs: []string{"compression-locks"}, TagSlugs: []string{"compression"}},
		{Name: "Calf Slicer", Description: "A compression lock that crushes the calf into the hamstring using a shin as a wedge behind the knee joint", CategorySlugs: []string{"compression-locks"}, TagSlugs: []string{"compression"}},
	}

	for _, t := range bjjTechniques {
		t.Slug = validate.GenerateSlug(t.Name)
		seedTechniqueDoc(ctx, fs, "bjj", t)
	}

	slog.Info("seeding completed successfully")
}

func seedDisciplineDoc(ctx context.Context, fs *firestore.Client, d seedDiscipline) {
	ref := fs.Collection("disciplines").Doc(d.Slug)
	doc, err := ref.Get(ctx)
	if err == nil && doc.Exists() {
		slog.Info("discipline exists, skipping", "slug", d.Slug)
		return
	}

	now := time.Now()
	_, err = ref.Set(ctx, map[string]interface{}{
		"name":        d.Name,
		"slug":        d.Slug,
		"description": d.Description,
		"createdAt":   now,
		"updatedAt":   now,
	})
	if err != nil {
		slog.Error("failed to seed discipline", "slug", d.Slug, "error", err)
		return
	}
	slog.Info("seeded discipline", "slug", d.Slug)
}

func seedCategoryDoc(ctx context.Context, fs *firestore.Client, disciplineID string, c seedCategory, parentID *string) {
	slug := validate.GenerateSlug(c.Name)
	ref := fs.Collection("categories").Doc(slug)
	doc, err := ref.Get(ctx)

	if err == nil && doc.Exists() {
		// Update description if changed and still system-owned
		data := doc.Data()
		ownerUid, _ := data["ownerUid"].(string)
		existingDesc, _ := data["description"].(string)
		if ownerUid == "system" && existingDesc != c.Description {
			_, uErr := ref.Update(ctx, []firestore.Update{
				{Path: "description", Value: c.Description},
				{Path: "updatedAt", Value: time.Now()},
			})
			if uErr != nil {
				slog.Error("failed to update category description", "slug", slug, "error", uErr)
			} else {
				slog.Info("updated category description", "slug", slug)
			}
		} else {
			slog.Info("category exists, skipping", "slug", slug)
		}
	} else {
		// Create new category
		now := time.Now()
		var parentVal interface{}
		if parentID != nil {
			parentVal = *parentID
		}
		_, cErr := ref.Set(ctx, map[string]interface{}{
			"name":         c.Name,
			"slug":         slug,
			"description":  c.Description,
			"disciplineId": disciplineID,
			"parentId":     parentVal,
			"ownerUid":     "system",
			"createdAt":    now,
			"updatedAt":    now,
		})
		if cErr != nil {
			slog.Error("failed to seed category", "slug", slug, "error", cErr)
			return
		}
		slog.Info("seeded category", "slug", slug)
	}

	// Recurse into children
	for _, child := range c.Children {
		seedCategoryDoc(ctx, fs, disciplineID, child, &slug)
	}
}

func seedTechniqueDoc(ctx context.Context, fs *firestore.Client, disciplineID string, t seedTechnique) {
	ref := fs.Collection("techniques").Doc(t.Slug)
	doc, err := ref.Get(ctx)

	categoryIDs := t.CategorySlugs
	if categoryIDs == nil {
		categoryIDs = []string{}
	}
	tagIDs := t.TagSlugs
	if tagIDs == nil {
		tagIDs = []string{}
	}

	if err == nil && doc.Exists() {
		// Update description, categoryIds, and tagIds if system-owned
		data := doc.Data()
		ownerUid, _ := data["ownerUid"].(string)
		if ownerUid == "system" {
			updates := []firestore.Update{
				{Path: "updatedAt", Value: time.Now()},
			}
			existingDesc, _ := data["description"].(string)
			if existingDesc != t.Description && t.Description != "" {
				updates = append(updates, firestore.Update{Path: "description", Value: t.Description})
			}
			// Merge categoryIds
			existingCats, _ := data["categoryIds"].([]interface{})
			catSet := make(map[string]bool)
			for _, c := range existingCats {
				if cs, ok := c.(string); ok {
					catSet[cs] = true
				}
			}
			for _, c := range categoryIDs {
				catSet[c] = true
			}
			merged := make([]string, 0, len(catSet))
			for c := range catSet {
				merged = append(merged, c)
			}
			updates = append(updates, firestore.Update{Path: "categoryIds", Value: merged})

			// Merge tagIds
			existingTags, _ := data["tagIds"].([]interface{})
			tagSet := make(map[string]bool)
			for _, tg := range existingTags {
				if ts, ok := tg.(string); ok {
					tagSet[ts] = true
				}
			}
			for _, tg := range tagIDs {
				tagSet[tg] = true
			}
			mergedTags := make([]string, 0, len(tagSet))
			for tg := range tagSet {
				mergedTags = append(mergedTags, tg)
			}
			updates = append(updates, firestore.Update{Path: "tagIds", Value: mergedTags})

			_, uErr := ref.Update(ctx, updates)
			if uErr != nil {
				slog.Error("failed to update technique", "slug", t.Slug, "error", uErr)
			} else {
				slog.Info("updated technique", "slug", t.Slug, "categories", merged, "tags", mergedTags)
			}
		} else {
			slog.Info("technique exists (user-owned), skipping", "slug", t.Slug)
		}
		return
	}

	now := time.Now()
	_, err = ref.Set(ctx, map[string]interface{}{
		"name":         t.Name,
		"slug":         t.Slug,
		"description":  t.Description,
		"disciplineId": disciplineID,
		"categoryIds":  categoryIDs,
		"tagIds":       tagIDs,
		"ownerUid":     "system",
		"createdAt":    now,
		"updatedAt":    now,
	})
	if err != nil {
		slog.Error("failed to seed technique", "slug", t.Slug, "error", err)
		return
	}
	slog.Info("seeded technique", "slug", t.Slug)
}

func seedTagDoc(ctx context.Context, fs *firestore.Client, disciplineID string, t seedTag) {
	slug := validate.GenerateSlug(t.Name)
	ref := fs.Collection("tags").Doc(slug)
	doc, err := ref.Get(ctx)

	if err == nil && doc.Exists() {
		// Update description if changed and system-owned
		data := doc.Data()
		ownerUid, _ := data["ownerUid"].(string)
		existingDesc, _ := data["description"].(string)
		if ownerUid == "system" && existingDesc != t.Description {
			_, uErr := ref.Update(ctx, []firestore.Update{
				{Path: "description", Value: t.Description},
				{Path: "updatedAt", Value: time.Now()},
			})
			if uErr != nil {
				slog.Error("failed to update tag description", "slug", slug, "error", uErr)
			} else {
				slog.Info("updated tag description", "slug", slug)
			}
		} else {
			slog.Info("tag exists, skipping", "slug", slug)
		}
		return
	}

	now := time.Now()
	_, err = ref.Set(ctx, map[string]interface{}{
		"name":         t.Name,
		"slug":         slug,
		"description":  t.Description,
		"disciplineId": disciplineID,
		"ownerUid":     "system",
		"createdAt":    now,
		"updatedAt":    now,
	})
	if err != nil {
		slog.Error("failed to seed tag", "slug", slug, "error", err)
		return
	}
	slog.Info("seeded tag", "slug", slug)
}

func bootstrapAdmin(ctx context.Context, clients *store.FirebaseClients, email string) {
	u, err := clients.Auth.GetUserByEmail(ctx, email)
	if err != nil {
		slog.Error("failed to find admin user by email", "email", email, "error", err)
		return
	}

	claims := u.CustomClaims
	if claims == nil {
		claims = map[string]interface{}{}
	}

	// Set admin for all seeded disciplines
	roles, _ := claims["roles"].(map[string]interface{})
	if roles == nil {
		roles = map[string]interface{}{}
	}
	roles["bjj"] = "admin"
	roles["jkd"] = "admin"
	claims["roles"] = roles

	if err := clients.Auth.SetCustomUserClaims(ctx, u.UID, claims); err != nil {
		slog.Error("failed to set admin claims", "email", email, "error", err)
		return
	}
	slog.Info("bootstrapped admin user", "email", email, "uid", u.UID)
}
