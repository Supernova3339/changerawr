import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {validateAuthAndGetUser, sendError, sendSuccess} from "@/lib/utils/changelog";
import {Prisma} from "@prisma/client";

/**
 * @method GET
 * @description Get widget - serves loader script (public) or JSON (auth required based on Accept header)
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string; widgetId: string }> }
) {
    const {projectId, widgetId} = await context.params;
    const acceptHeader = request.headers.get("accept") || "";

    // If requesting JSON (dashboard), require auth
    if (acceptHeader.includes("application/json")) {
        try {
            await validateAuthAndGetUser();

            const widget = await db.widget.findUnique({
                where: {id: widgetId},
            });

            if (!widget) {
                return sendError("Widget not found", 404);
            }

            return NextResponse.json({widget});
        } catch (error) {
            console.error("❌ Failed to get widget:", error);
            if (error instanceof Error && error.message === "Authentication required") {
                return sendError("Unauthorized", 401);
            }
            return sendError("Failed to get widget", 500);
        }
    }

    // Otherwise, serve public widget loader script
    try {
        const widget = await db.widget.findUnique({
            where: {id: widgetId},
            include: {
                project: {
                    select: {
                        id: true,
                        isPublic: true,
                    },
                },
            },
        });

        if (!widget || widget.projectId !== projectId) {
            return new NextResponse('console.error("Changerawr: Widget not found");', {
                status: 404,
                headers: {"Content-Type": "application/javascript"},
            });
        }

        if (!widget.project.isPublic || !widget.isActive) {
            return new NextResponse('console.error("Changerawr: Widget is not available");', {
                status: 403,
                headers: {"Content-Type": "application/javascript"},
            });
        }

        const bundleFile = widget.variant === "classic" ? "widget-classic.js" : `widget-${widget.variant}.js`;

        const script = `(function() {
      const currentScript = document.currentScript;
      if (!currentScript) {
          console.error('Changerawr: Could not initialize widget');
          return;
      }

      const widgetConfig = ${JSON.stringify(widget.settings)};
      const options = {
          projectId: '${projectId}',
          widgetId: '${widgetId}',
          variant: '${widget.variant}',
          baseUrl: '${process.env.NEXT_PUBLIC_APP_URL}',
          customCSS: ${widget.customCSS ? `\`${widget.customCSS.replace(/`/g, "\\`")}\`` : "null"},
          theme: currentScript.getAttribute('data-theme') || widgetConfig.theme || 'light',
          position: currentScript.getAttribute('data-position') || widgetConfig.position || 'bottom-right',
          maxHeight: currentScript.getAttribute('data-max-height') || widgetConfig.maxHeight || '400px',
          isPopup: currentScript.getAttribute('data-popup') === 'true' || widgetConfig.isPopup || false,
          trigger: currentScript.getAttribute('data-trigger') || widgetConfig.trigger,
          maxEntries: currentScript.getAttribute('data-max-entries')
              ? parseInt(currentScript.getAttribute('data-max-entries'), 10)
              : (widgetConfig.maxEntries || 3),
          hidden: currentScript.getAttribute('data-popup') === 'true' || widgetConfig.isPopup || false
      };

      const initWidget = () => {
          const container = document.createElement('div');
          container.id = 'changerawr-widget-' + Math.random().toString(36).substr(2, 9);
          const isPopupWithTrigger = options.isPopup && options.trigger;

          if (isPopupWithTrigger) {
              const triggerButton = document.getElementById(options.trigger);
              if (!triggerButton) {
                  console.error('Changerawr: Trigger button not found');
                  return;
              }
              container.style.display = 'none';
              document.body.appendChild(container);
              triggerButton.setAttribute('aria-haspopup', 'dialog');
          } else {
              currentScript.parentNode.insertBefore(container, currentScript);
          }

          const script = document.createElement('script');
          script.src = '${process.env.NEXT_PUBLIC_APP_URL}/${bundleFile}';
          script.onload = () => {
              if (!window.ChangerawrWidget || !window.ChangerawrWidget.init) {
                  console.error('Changerawr: Widget failed to initialize');
                  return;
              }
              const widget = window.ChangerawrWidget.init({ container, ...options });
              if (isPopupWithTrigger) {
                  const btn = document.getElementById(options.trigger);
                  if (btn) {
                      btn.addEventListener('click', () => {
                          widget.toggle();
                          btn.setAttribute('aria-expanded', widget.isOpen);
                      });
                  }
              }
          };
          script.onerror = () => console.error('Changerawr: Failed to load widget');
          document.head.appendChild(script);
      };

      if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initWidget);
      } else {
          initWidget();
      }
  })();`;

        return new NextResponse(script, {
            headers: {
                "Content-Type": "application/javascript",
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (error) {
        console.error("❌ Failed to serve widget:", error);
        return new NextResponse('console.error("Changerawr: Failed to load widget");', {
            status: 500,
            headers: {"Content-Type": "application/javascript"},
        });
    }
}

/**
 * @method PUT
 * @description Update a widget (auth required)
 */
export async function PUT(
    request: Request,
    context: { params: Promise<{ projectId: string; widgetId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        const {widgetId} = await context.params;
        const body = await request.json();

        const {name, variant, settings, customCSS, isActive} = body;

        if (variant) {
            const validVariants = ["classic", "floating", "modal", "announcement"];
            if (!validVariants.includes(variant)) {
                return sendError(`Invalid variant. Must be one of: ${validVariants.join(", ")}`, 400);
            }
        }

        const widget = await db.widget.update({
            where: {id: widgetId},
            data: {
                ...(name && {name}),
                ...(variant && {variant}),
                ...(settings !== undefined && {settings}),
                ...(customCSS !== undefined && {customCSS}),
                ...(isActive !== undefined && {isActive}),
            },
        });

        return NextResponse.json({widget});
    } catch (error) {
        console.error("❌ Failed to update widget:", error);
        if (error instanceof Error && error.message === "Authentication required") {
            return sendError("Unauthorized", 401);
        }
        return sendError("Failed to update widget", 500);
    }
}

/**
 * @method DELETE
 * @description Delete a widget (auth required)
 */
export async function DELETE(
    request: Request,
    context: { params: Promise<{ projectId: string; widgetId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        const {widgetId} = await context.params;

        await db.widget.delete({
            where: {id: widgetId},
        });

        return sendSuccess({success: true});
    } catch (error) {
        console.error("❌ Failed to delete widget:", error);
        if (error instanceof Error && error.message === "Authentication required") {
            return sendError("Unauthorized", 401);
        }
        return sendError("Failed to delete widget", 500);
    }
}

/**
 * @method POST
 * @description Create a new widget (auth required)
 */
export async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        const {projectId} = await context.params;
        const body = await request.json();

        const name = body.name as string | undefined;
        const variant = body.variant as string | undefined;
        const settings = body.settings as Record<string, any> | undefined;
        const customCSS = body.customCSS as string | null | undefined;
        const isActive = body.isActive as boolean | undefined;

        if (!name || !variant) {
            return sendError("Missing required fields: name, variant", 400);
        }

        const validVariants = ["classic", "floating", "modal", "announcement"];
        if (!validVariants.includes(variant)) {
            return sendError(`Invalid variant. Must be one of: ${validVariants.join(", ")}`, 400);
        }

        const widget = await db.widget.create({
            data: {
                project: {connect: {id: projectId}},
                name,
                variant,
                settings: settings ?? {},
                customCSS: customCSS ?? null,
                isActive: isActive ?? true,
            } as Prisma.WidgetCreateInput, // 👈 explicitly cast
        });


        return NextResponse.json({widget}, {status: 201});
    } catch (error) {
        console.error("❌ Widget creation failed:");
        console.error(error instanceof Error ? error.stack || error.message : error);

        if (error instanceof Error && error.message === "Authentication required") {
            return sendError("Unauthorized", 401);
        }

        return sendError("Failed to create widget", 500);
    }
}
