extends Node
## Benchmark scene: only the original three meshes, plinth, light and two cheap post passes.

const NAVY := Color("121738")
const CREAM := Color("f5e8c7")

var viewport: SubViewport
var image: TextureRect
var camera: Camera3D
var picaro: Picaro
var plinth: MeshInstance3D
var dither: ShaderMaterial
var ascii_material: ShaderMaterial
var host_input: JavaScriptObject
var elapsed := 0.0
var stats_elapsed := 0.0
var frames := 0
var frame_total := 0.0
var frame_samples: Array[float] = []
var fall_count := 0
var jump_counter := 0
var reset_counter := 0
var demo_jump := 0
var demo_was := false
var paused := false
var mode := "dither"
var last_size := Vector2i.ZERO
var demo_clock := 0.0
var first_frame_ready := false

func _ready() -> void:
	viewport = SubViewport.new()
	viewport.name = "World"
	viewport.process_mode = Node.PROCESS_MODE_PAUSABLE
	viewport.own_world_3d = true
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	viewport.msaa_3d = Viewport.MSAA_DISABLED
	viewport.positional_shadow_atlas_size = 1024
	add_child(viewport)

	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = NAVY
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color.WHITE
	environment.ambient_light_energy = 0.25
	environment.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	var world := WorldEnvironment.new()
	world.environment = environment
	viewport.add_child(world)

	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.keep_aspect = Camera3D.KEEP_HEIGHT
	camera.position = Vector3(19, 16, 23)
	camera.far = 100.0
	viewport.add_child(camera)
	camera.look_at(Vector3(0, 2, 0))

	var light := DirectionalLight3D.new()
	light.light_energy = 1.0
	light.shadow_enabled = true
	light.directional_shadow_max_distance = 60.0
	light.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	viewport.add_child(light)
	light.position = Vector3(-10, 18, 12)
	light.look_at(Vector3.ZERO)

	var gray := StandardMaterial3D.new()
	gray.albedo_color = Color("b8b8b8")
	gray.roughness = 1.0
	plinth = MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(12, 0.7, 9)
	plinth.mesh = box
	var platform_gray := gray.duplicate() as StandardMaterial3D
	platform_gray.albedo_color = Color("8f8f8f")
	plinth.material_override = platform_gray
	plinth.position.y = -0.35
	viewport.add_child(plinth)
	var body := StaticBody3D.new()
	body.position.y = -0.35
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = box.size
	collision.shape = shape
	body.add_child(collision)
	viewport.add_child(body)

	picaro = preload("res://Personaje/Picaro.tscn").instantiate()
	picaro.position = Vector3(0, 0.96, 0)
	viewport.add_child(picaro)
	for mesh in picaro.get_node("Visuales").get_children():
		mesh.material_override = gray

	image = TextureRect.new()
	image.mouse_filter = Control.MOUSE_FILTER_IGNORE
	image.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	image.texture = viewport.get_texture()
	add_child(image)
	dither = ShaderMaterial.new()
	dither.shader = preload("res://Render/dither_2d.gdshader")
	dither.set_shader_parameter("color_a", NAVY)
	dither.set_shader_parameter("color_b", CREAM)
	ascii_material = ShaderMaterial.new()
	ascii_material.shader = preload("res://ascii.gdshader")
	ascii_material.set_shader_parameter("color_a", NAVY)
	ascii_material.set_shader_parameter("color_b", CREAM)
	image.material = dither
	_resize()
	if OS.has_feature("web"):
		host_input = JavaScriptBridge.get_interface("window")
		await RenderingServer.frame_post_draw
		first_frame_ready = true
		_send({"type": "ready"})
	else:
		first_frame_ready = true
		print("EQUILIBRIO_READY")

func _resize() -> void:
	var window_size := Vector2i(get_viewport().get_visible_rect().size)
	if window_size == last_size or window_size.x < 1 or window_size.y < 1:
		return
	last_size = window_size
	var aspect := float(window_size.x) / float(window_size.y)
	var render_size := Vector2(576.0, 576.0 / aspect)
	render_size *= minf(1.0, 768.0 / maxf(render_size.x, render_size.y))
	viewport.size = Vector2i(render_size.round())
	image.size = Vector2(window_size)
	# Godot's KEEP_HEIGHT size is vertical. Portrait expands to keep the plinth in view.
	camera.size = 16.0 * maxf(1.0, 1.0 / aspect)

func _process(delta: float) -> void:
	_resize()
	var input: Dictionary = {}
	if host_input != null:
		var json = JavaScriptBridge.eval("JSON.stringify(window.__equilibrioInput || {})")
		var parsed = JSON.parse_string(str(json))
		if parsed is Dictionary:
			input = parsed
	elif OS.get_cmdline_user_args().has("--demo"):
		input = {"demo": true}

	# Always present one frame before honoring an initially paused host, so ready cannot deadlock.
	var requested_pause := bool(input.get("paused", false)) and first_frame_ready
	if paused != requested_pause:
		paused = requested_pause
		get_tree().paused = paused
		viewport.render_target_update_mode = SubViewport.UPDATE_DISABLED if paused else SubViewport.UPDATE_ALWAYS
		RenderingServer.render_loop_enabled = not paused
	var desired_mode := str(input.get("mode", "dither"))
	if desired_mode != mode:
		mode = desired_mode
		image.material = ascii_material if mode == "ascii" else (null if mode == "solid" else dither)
	var reset := int(input.get("reset", 0))
	if reset != reset_counter:
		reset_counter = reset
		_reset()
	var jump := int(input.get("jump", 0))
	var new_jump := jump != jump_counter
	jump_counter = jump
	if not paused:
		elapsed += delta
		var demo := bool(input.get("demo", false))
		if demo != demo_was:
			demo_clock = 0.0
			demo_jump = 0
			demo_was = demo
		if demo:
			demo_clock += delta
			# Integral stays comfortably inside the platform; enough speed to read the original gait.
			picaro.entrada = Vector2(sin(demo_clock * 1.1) * 0.32, cos(demo_clock * 1.3) * 0.24)
			var beat := int(demo_clock / 3.0)
			picaro.saltar = picaro.saltar or beat != demo_jump
			demo_jump = beat
		else:
			picaro.entrada = Vector2(float(input.get("x", 0.0)), float(input.get("z", 0.0))).limit_length(1.0)
			picaro.saltar = picaro.saltar or new_jump
		picaro.arriba = bool(input.get("raised", false))
		if picaro.position.y < -14.0:
			fall_count += 1
			_reset()
		# Visual-only gentle balance. Collision top stays horizontal, at y=0.
		plinth.rotation.z = lerpf(plinth.rotation.z, -picaro.position.x * 0.006, 1.0 - exp(-5.0 * delta))
		plinth.rotation.x = lerpf(plinth.rotation.x, picaro.position.z * 0.006, 1.0 - exp(-5.0 * delta))
		frames += 1
		frame_total += delta
		frame_samples.append(delta * 1000.0)
	stats_elapsed += delta
	if stats_elapsed >= 1.0:
		_send({"type": "stats", "fps": frames / maxf(frame_total, 0.001),
			"frameMs": frame_total * 1000.0 / maxf(frames, 1), "frameSamples": frame_samples,
			"drawCalls": Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME),
			"triangles": Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME),
			"fallCount": fall_count, "x": picaro.position.x, "y": picaro.position.y,
			"z": picaro.position.z, "grounded": picaro.is_on_floor()})
		stats_elapsed = 0.0
		frames = 0
		frame_total = 0.0
		frame_samples.clear()

func _reset() -> void:
	picaro.position = Vector3(0, 0.96, 0)
	picaro.velocity = Vector3.ZERO
	picaro.saltar = false
	picaro.rotation.y = 0.0
	plinth.rotation = Vector3.ZERO
	demo_clock = 0.0
	demo_jump = 0

func _send(data: Dictionary) -> void:
	if not OS.has_feature("web"):
		return
	data["source"] = "equilibrio-godot"
	JavaScriptBridge.eval("window.parent.postMessage(%s, window.location.origin)" % JSON.stringify(data))
