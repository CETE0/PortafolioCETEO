class_name Picaro
extends CharacterBody3D
## Minimal campaign-free controller. The original scene and animator are copied verbatim.

signal estado_cambiado(levantado: bool)
signal transicion_terminada(levantado: bool)
signal golpe_suelo_aterrizado(posicion: Vector3)
signal salto
signal aterrizo(rapidez: float)
signal bloqueado
signal trepar_iniciado
signal pillado
signal cabezazo

@export var velocidad := 7.0
@export var gravedad := -24.8
@export var velocidad_salto := 10.0
@export var velocidad_giro := 10.0

var empujando := false
var levantado := false
var entrada := Vector2.ZERO
var saltar := false
var arriba := false

@onready var anim: AnimationPlayer = $AnimationPlayer

func _ready() -> void:
	anim.animation_finished.connect(func(_nombre): transicion_terminada.emit(levantado))
	anim.play(&"RESET")
	anim.advance(0)
	# Campaign probes are unnecessary in this deliberately isolated benchmark.
	for sensor in $Sensores.get_children():
		sensor.enabled = false

func _physics_process(delta: float) -> void:
	if arriba != levantado:
		levantado = arriba
		if levantado:
			anim.play(&"extend")
		else:
			anim.play_backwards(&"extend")
		$ColisionNeutral.disabled = levantado
		$ColisionCuerpoLevantado.disabled = not levantado
		estado_cambiado.emit(levantado)
	# x/z are world-space axes, shared with Three.js; no iframe input polling.
	var dir := Vector3(entrada.x, 0.0, entrada.y).limit_length(1.0)
	if dir.length_squared() > 0.00001:
		rotation.y = lerp_angle(rotation.y, atan2(dir.x, dir.z), velocidad_giro * delta)
	velocity.x = dir.x * velocidad
	velocity.z = dir.z * velocidad
	if not is_on_floor():
		velocity.y += gravedad * delta
	if saltar and is_on_floor():
		velocity.y = velocidad_salto
		salto.emit()
	saltar = false
	var caida := -velocity.y
	var en_aire := not is_on_floor()
	move_and_slide()
	if en_aire and is_on_floor():
		aterrizo.emit(caida)
